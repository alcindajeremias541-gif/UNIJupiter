const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// Necessário para o express-rate-limit identificar o IP real
// quando existe um único proxy (ex.: Nginx, Render, Railway).
// Não usar "true" — permitiria falsificação do IP via cabeçalho.
app.set("trust proxy", 1);

// Esconde o cabeçalho X-Powered-By (o helmet já faz, reforço explícito).
app.disable("x-powered-by");


// =====================================================
// SEGURANÇA — HEADERS
// =====================================================
// CSP ativada: o site usa <style> interno e Google Fonts /
// Unsplash, por isso permitimos 'unsafe-inline' só em estilos.
// Scripts: apenas ficheiros próprios (script.js), sem inline.

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com"
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https://images.unsplash.com"
                ],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: "no-referrer-when-downgrade" }
    })
);


// =====================================================
// LIMITAÇÃO DE PEDIDOS
// =====================================================

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Demasiados pedidos. Tente novamente mais tarde."
    }
});

app.use(globalLimiter);

// Limite mais apertado só para a API — trava spam de formulários
// sem afetar a navegação normal no site.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Demasiados envios. Tente novamente mais tarde."
    }
});

app.use("/api/", apiLimiter);


// =====================================================
// MIDDLEWARE — BODY COM LIMITE
// =====================================================
// Limite pequeno impede abusos (ex.: enviar 10 MB de texto).

app.use(express.json({ limit: "20kb" }));

app.use(
    express.urlencoded({
        extended: false,
        limit: "20kb"
    })
);


// =====================================================
// BLOQUEIO DE FICHEIROS SENSÍVEIS
// Tem de vir ANTES do express.static.
// =====================================================

const BLOCKED_PATHS = [
    "/server.js",
    "/package.json",
    "/package-lock.json",
    "/.env",
    "/README.md"
];

app.use((req, res, next) => {
    const urlPath = req.path;

    if (
        BLOCKED_PATHS.includes(urlPath) ||
        urlPath.startsWith("/.git") ||
        urlPath.startsWith("/node_modules") ||
        urlPath.endsWith(".env")
    ) {
        return res.status(404).json({
            success: false,
            message: "Recurso não encontrado."
        });
    }

    next();
});


// =====================================================
// FICHEIROS DO WEBSITE (estrutura com src/)
// HTML/CSS/JS em src/, imagens em ../imagens/.
// =====================================================

app.use(
    express.static(path.join(__dirname), {
        dotfiles: "deny",
        index: "index.html",
        maxAge: "1h",
        redirect: false
    })
);

// Pasta de imagens — suporta as duas localizações para o deploy
// não quebrar: src/imagens/* (autocontida) e ../imagens/* (atual).
app.use(
    "/imagens",
    express.static(path.join(__dirname, "imagens"), {
        dotfiles: "deny",
        maxAge: "1h",
        redirect: false
    })
);
app.use(
    "/imagens",
    express.static(path.join(__dirname, "..", "imagens"), {
        dotfiles: "deny",
        maxAge: "1h",
        redirect: false
    })
);


// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// =====================================================
// VALIDAÇÃO PARTILHADA
// =====================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Telefone: dígitos, espaços e + - ( ) . Mínimo 6 dígitos.
const PHONE_REGEX = /^[+\d][\d\s\-().]{5,24}$/;

const CURSOS_VALIDOS = new Set([
    "engenharia-florestal",
    "medicina-geral",
    "geologia-e-minas",
    "antropologia",
    "engenharia-eletrica",
    "ciencia-da-computacao",
    "engenharia-mecanica"
]);

function cleanString(value, maxLength) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

// Remove quebras de linha antes de escrever no terminal.
// Evita log injection / falsificação de linhas de log.
function safeForLog(value) {
    return String(value).replace(/[\r\n]+/g, " ").slice(0, 500);
}

function isValidEmail(email) {
    return (
        typeof email === "string" &&
        email.length <= 254 &&
        EMAIL_REGEX.test(email)
    );
}

function badRequest(res, message) {
    return res.status(400).json({
        success: false,
        message
    });
}


// =====================================================
// CONTACTO
// =====================================================

app.post("/api/contacto", (req, res) => {

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return badRequest(res, "Pedido inválido.");
    }

    const nome = cleanString(req.body.nome, 100);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const telefone = cleanString(req.body.telefone, 25);
    const assunto = cleanString(req.body.assunto, 150);
    const mensagem = cleanString(req.body.mensagem, 5000);


    if (!nome || !email || !assunto || !mensagem) {

        return badRequest(res, "Preencha todos os campos obrigatórios.");

    }

    if (nome.length < 2) {
        return badRequest(res, "Introduza um nome válido.");
    }

    if (!isValidEmail(email)) {

        return badRequest(res, "Introduza um endereço de e-mail válido.");

    }

    if (telefone && !PHONE_REGEX.test(telefone)) {
        return badRequest(res, "Introduza um número de telefone válido.");
    }

    if (assunto.length < 3) {
        return badRequest(res, "Introduza um assunto válido.");
    }

    if (mensagem.length < 10) {
        return badRequest(res, "A mensagem deve ter pelo menos 10 caracteres.");
    }


    console.log("");
    console.log("=================================");
    console.log("NOVA MENSAGEM DE CONTACTO");
    console.log("=================================");

    console.log("Nome:", safeForLog(nome));
    console.log("E-mail:", safeForLog(email));
    console.log("Telefone:", telefone ? safeForLog(telefone) : "Não indicado");
    console.log("Assunto:", safeForLog(assunto));
    console.log("Mensagem:", safeForLog(mensagem));

    console.log("=================================");
    console.log("");


    return res.json({

        success: true,

        message:
            "Mensagem recebida com sucesso."

    });

});


// =====================================================
// CANDIDATURA
// =====================================================

app.post("/api/candidatura", (req, res) => {

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return badRequest(res, "Pedido inválido.");
    }

    const nome = cleanString(req.body.nome, 100);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const telefone = cleanString(req.body.telefone, 25);
    const curso = cleanString(req.body.curso, 60).toLowerCase();
    const mensagem = cleanString(req.body.mensagem, 2000);


    if (!nome || !email || !curso) {

        return badRequest(res, "Preencha o nome, e-mail e curso.");

    }

    if (nome.length < 2) {
        return badRequest(res, "Introduza um nome válido.");
    }

    if (!isValidEmail(email)) {

        return badRequest(res, "Introduza um endereço de e-mail válido.");

    }

    if (telefone && !PHONE_REGEX.test(telefone)) {
        return badRequest(res, "Introduza um número de telefone válido.");
    }

    if (!CURSOS_VALIDOS.has(curso)) {
        return badRequest(res, "Selecione um curso válido.");
    }


    console.log("");
    console.log("=================================");
    console.log("NOVA CANDIDATURA");
    console.log("=================================");

    console.log("Nome:", safeForLog(nome));
    console.log("E-mail:", safeForLog(email));
    console.log("Telefone:", telefone ? safeForLog(telefone) : "Não indicado");
    console.log("Curso:", safeForLog(curso));
    console.log("Mensagem:", mensagem ? safeForLog(mensagem) : "Não indicada");

    console.log("=================================");
    console.log("");


    return res.json({

        success: true,

        message:
            "Candidatura recebida com sucesso."

    });

});


// =====================================================
// ERRO 404 — JSON para a API, HTML para o site
// =====================================================

app.use((req, res) => {

    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            message: "Recurso não encontrado."
        });
    }

    res.status(404).send(`

        <!DOCTYPE html>

        <html lang="pt-PT">

        <head>

            <meta charset="UTF-8">

            <title>Página não encontrada</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 50px;
                    background: #eee3d0;
                    color: #27231f;
                }

                h1 {
                    font-size: 50px;
                }

                a {
                    color: #8e4f38;
                }

            </style>

        </head>

        <body>

            <h1>404</h1>

            <p>
                A página que procura não existe.
            </p>

            <a href="/">
                Voltar à página inicial
            </a>

        </body>

        </html>

    `);

});


// =====================================================
// ERROS — não expor detalhes internos
// =====================================================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {

    if (err && err.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Pedido demasiado grande."
        });
    }

    if (err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Pedido inválido."
        });
    }

    console.error("Erro interno:", err && err.message ? err.message : err);

    return res.status(500).json({
        success: false,
        message: "Erro interno. Tente novamente mais tarde."
    });

});


// =====================================================
// INICIAR SERVIDOR
// =====================================================

if (require.main === module) {

    app.listen(PORT, () => {

        console.log("");
        console.log("=================================");
        console.log(" UNIVERSIDADE JUPITER");
        console.log("=================================");
        console.log(`Servidor: http://localhost:${PORT}`);
        console.log("Servidor iniciado com sucesso.");
        console.log("=================================");
        console.log("");

    });

}

module.exports = app;
