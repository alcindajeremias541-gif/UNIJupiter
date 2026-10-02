const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;


// =====================================================
// SEGURANÇA
// =====================================================

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


// =====================================================
// LIMITAÇÃO DE PEDIDOS
// Protege contra spam e excesso de pedidos
// =====================================================

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Demasiados pedidos. Tente novamente mais tarde."
    }
});

app.use(limiter);


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// FICHEIROS DO WEBSITE
// =====================================================

app.use(
    express.static(
        path.join(__dirname)
    )
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
// CONTACTO
// =====================================================

app.post("/api/contacto", (req, res) => {

    const {
        nome,
        email,
        telefone,
        assunto,
        mensagem
    } = req.body;


    // Validação básica

    if (!nome || !email || !assunto || !mensagem) {

        return res.status(400).json({

            success: false,

            message:
                "Preencha todos os campos obrigatórios."

        });

    }


    // Validação simples do e-mail

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

        return res.status(400).json({

            success: false,

            message:
                "Introduza um endereço de e-mail válido."

        });

    }


    // Por enquanto mostramos os dados no terminal.
    // Mais tarde vamos ligar ao Nodemailer.

    console.log("");
    console.log("=================================");
    console.log("NOVA MENSAGEM DE CONTACTO");
    console.log("=================================");

    console.log("Nome:", nome);
    console.log("E-mail:", email);
    console.log("Telefone:", telefone || "Não indicado");
    console.log("Assunto:", assunto);
    console.log("Mensagem:", mensagem);

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

    const {
        nome,
        email,
        telefone,
        curso,
        mensagem
    } = req.body;


    // Campos obrigatórios

    if (!nome || !email || !curso) {

        return res.status(400).json({

            success: false,

            message:
                "Preencha o nome, e-mail e curso."

        });

    }


    // Validação do e-mail

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

        return res.status(400).json({

            success: false,

            message:
                "Introduza um endereço de e-mail válido."

        });

    }


    // Mostrar candidatura no terminal

    console.log("");
    console.log("=================================");
    console.log("NOVA CANDIDATURA");
    console.log("=================================");

    console.log("Nome:", nome);
    console.log("E-mail:", email);
    console.log("Telefone:", telefone || "Não indicado");
    console.log("Curso:", curso);
    console.log("Mensagem:", mensagem || "Não indicada");

    console.log("=================================");
    console.log("");


    return res.json({

        success: true,

        message:
            "Candidatura recebida com sucesso."

    });

});


// =====================================================
// ERRO 404
// =====================================================

app.use((req, res) => {

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
// INICIAR SERVIDOR
// =====================================================

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
