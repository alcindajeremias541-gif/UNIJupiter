const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const fs = require("node:fs");
const path = require("node:path");

const app = require("../server.js");

const contactoValido = {
    nome: "Ana Silva",
    email: "ana.silva@example.com",
    telefone: "+258 84 123 4567",
    assunto: "Informação sobre cursos",
    mensagem: "Gostaria de receber mais informação sobre os cursos disponíveis."
};

const candidaturaValida = {
    nome: "João Santos",
    email: "joao.santos@example.com",
    telefone: "+258 82 000 0000",
    curso: "ciencia-da-computacao",
    mensagem: "Quero candidatar-me ao curso."
};

describe("páginas e ficheiros estáticos", () => {
    it("GET / devolve a página principal", async () => {
        const res = await request(app).get("/");
        assert.equal(res.status, 200);
        assert.match(res.headers["content-type"], /html/);
        assert.match(res.text, /Universidade Jupiter/);
    });

    it("serve páginas unificadas com os IDs em português", async () => {
        for (const pagina of ["index.html", "cursos.html", "candidatura.html", "contacto.html", "campus.html", "sobre-nos.html", "servicos.html", "faq.html"]) {
            const res = await request(app).get(`/${pagina}`);
            assert.equal(res.status, 200, pagina);
            assert.match(res.text, /id="botao-menu"/, pagina);
            assert.match(res.text, /id="navegacao-principal"/, pagina);
        }
    });

    it("não serve <style> interno — CSS está unificado em style.css", async () => {
        for (const pagina of ["sobre-nos.html", "servicos.html", "faq.html"]) {
            const res = await request(app).get(`/${pagina}`);
            assert.equal(res.status, 200, pagina);
            assert.doesNotMatch(res.text, /<style/i, pagina);
        }
    });

    it("serve style.css e script.js", async () => {
        const css = await request(app).get("/style.css");
        assert.equal(css.status, 200);
        assert.match(css.text, /#botao-menu/);
        assert.match(css.text, /#navegacao-principal/);

        const js = await request(app).get("/script.js");
        assert.equal(js.status, 200);
        assert.match(js.text, /botao-menu/);
        assert.match(js.text, /navegacao-principal/);
        assert.doesNotMatch(js.text, /mobile-menu-button/);
    });
});

describe("bloqueio de ficheiros sensíveis (sem base de dados)", () => {
    it("bloqueia server.js, package.json e .env", async () => {
        for (const caminho of ["/server.js", "/package.json", "/package-lock.json", "/.env"]) {
            const res = await request(app).get(caminho);
            assert.equal(res.status, 404, caminho);
            assert.equal(res.body.success, false);
        }
    });

    it("bloqueia /node_modules e /.git", async () => {
        const res1 = await request(app).get("/node_modules/express/package.json");
        assert.equal(res1.status, 404);
        const res2 = await request(app).get("/.git/config");
        assert.equal(res2.status, 404);
    });
});

describe("POST /api/contacto", () => {
    it("aceita mensagem válida", async () => {
        const res = await request(app).post("/api/contacto").send(contactoValido);
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    });

    it("rejeita campos em falta", async () => {
        const res = await request(app).post("/api/contacto").send({ nome: "Ana" });
        assert.equal(res.status, 400);
        assert.equal(res.body.success, false);
    });

    it("rejeita e-mail inválido", async () => {
        const res = await request(app).post("/api/contacto").send({ ...contactoValido, email: "invalido" });
        assert.equal(res.status, 400);
    });

    it("rejeita mensagem curta e telefone inválido", async () => {
        const curta = await request(app).post("/api/contacto").send({ ...contactoValido, mensagem: "curta" });
        assert.equal(curta.status, 400);

        const tel = await request(app).post("/api/contacto").send({ ...contactoValido, telefone: "abc" });
        assert.equal(tel.status, 400);
    });

    it("rejeita corpo inválido (array) e JSON malformado", async () => {
        const res = await request(app).post("/api/contacto")
            .set("Content-Type", "application/json")
            .send(JSON.stringify([1, 2, 3]));
        assert.equal(res.status, 400);
    });
});

describe("POST /api/candidatura", () => {
    it("aceita candidatura válida", async () => {
        const res = await request(app).post("/api/candidatura").send(candidaturaValida);
        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
    });

    it("rejeita curso inválido", async () => {
        const res = await request(app).post("/api/candidatura").send({ ...candidaturaValida, curso: "curso-inexistente" });
        assert.equal(res.status, 400);
    });

    it("aceita todos os cursos válidos", async () => {
        const cursos = [
            "engenharia-florestal", "medicina-geral", "geologia-e-minas",
            "antropologia", "engenharia-eletrica", "ciencia-da-computacao",
            "engenharia-mecanica"
        ];
        for (const curso of cursos) {
            const res = await request(app).post("/api/candidatura").send({ ...candidaturaValida, curso });
            assert.equal(res.status, 200, curso);
        }
    });

    it("rejeita nome/e-mail em falta ou inválidos", async () => {
        const semNome = await request(app).post("/api/candidatura").send({ email: "a@b.com", curso: "antropologia" });
        assert.equal(semNome.status, 400);

        const emailMau = await request(app).post("/api/candidatura").send({ ...candidaturaValida, email: "mau" });
        assert.equal(emailMau.status, 400);
    });
});

describe("erros 404 e segurança", () => {
    it("devolve JSON para /api inexistente", async () => {
        const res = await request(app).get("/api/nao-existe");
        assert.equal(res.status, 404);
        assert.equal(res.body.success, false);
    });

    it("devolve página HTML para rota inexistente", async () => {
        const res = await request(app).get("/pagina-que-nao-existe");
        assert.equal(res.status, 404);
        assert.match(res.text, /404/);
    });

    it("envia cabeçalhos de segurança do helmet", async () => {
        const res = await request(app).get("/");
        assert.ok(res.headers["content-security-policy"], "falta CSP");
        assert.ok(res.headers["x-content-type-options"], "falta X-Content-Type-Options");
    });

    it("rejeita pedido demasiado grande com 413", async () => {
        const grande = "a".repeat(25 * 1024);
        const res = await request(app).post("/api/contacto").send({ ...contactoValido, mensagem: grande });
        assert.equal(res.status, 413);
        assert.equal(res.body.success, false);
    });
});
