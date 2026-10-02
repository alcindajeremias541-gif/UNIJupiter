/* =========================================================
   UNIVERSIDADE JUPITER
   JavaScript + DOM
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       1. MENU MOBILE — DOM
    ====================================================== */
    const menuButton = document.getElementById("botao-menu");
    const mainNav = document.getElementById("navegacao-principal");

    if (menuButton && mainNav) {
        menuButton.addEventListener("click", () => {
            const isOpen = menuButton.getAttribute("aria-expanded") === "true";
            menuButton.setAttribute("aria-expanded", String(!isOpen));
            menuButton.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
            mainNav.classList.toggle("is-open", !isOpen);
        });

        mainNav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                menuButton.setAttribute("aria-expanded", "false");
                menuButton.setAttribute("aria-label", "Abrir menu");
                mainNav.classList.remove("is-open");
            });
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 850) {
                menuButton.setAttribute("aria-expanded", "false");
                menuButton.setAttribute("aria-label", "Abrir menu");
                mainNav.classList.remove("is-open");
            }
        });
    }

    /* =====================================================
       2. ANO AUTOMÁTICO — DOM
    ====================================================== */
    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    /* =====================================================
       3. FAQ INTERATIVO — DOM
       Clique numa pergunta para abrir/fechar a resposta.
    ====================================================== */
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach((item, index) => {
        const question = item.querySelector("h3");
        const answer = item.querySelector("p");

        if (!question || !answer) return;

        // Criamos atributos DOM para acessibilidade.
        question.setAttribute("tabindex", "0");
        question.setAttribute("role", "button");
        question.setAttribute("aria-expanded", "false");
        answer.id = `faq-answer-${index + 1}`;
        question.setAttribute("aria-controls", answer.id);
        item.classList.remove("faq-open");

        const toggleFAQ = () => {
            const open = item.classList.toggle("faq-open");
            question.setAttribute("aria-expanded", String(open));
        };

        question.addEventListener("click", toggleFAQ);
        question.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleFAQ();
            }
        });
    });

    /* =====================================================
       4. PESQUISA DE CURSOS — DOM
       O campo é criado pelo JavaScript, sem precisar escrever
       o HTML manualmente.
    ====================================================== */
    const courseGrid = document.querySelector(".course-grid");

    if (courseGrid) {
        const heading = courseGrid.parentElement;
        const searchBox = document.createElement("div");
        searchBox.className = "course-search";
        searchBox.innerHTML = `
            <label for="course-search-input">Pesquisar curso</label>
            <input id="course-search-input" type="search" placeholder="Ex.: Computação, Medicina..." autocomplete="off">
            <p id="course-search-result" class="course-search-result" aria-live="polite"></p>
        `;

        heading.insertBefore(searchBox, courseGrid);

        const input = searchBox.querySelector("#course-search-input");
        const result = searchBox.querySelector("#course-search-result");
        const cards = courseGrid.querySelectorAll(".course-card");

        const filterCourses = () => {
            const term = input.value.trim().toLowerCase();
            let visible = 0;

            cards.forEach((card) => {
                const text = card.textContent.toLowerCase();
                const match = text.includes(term);
                card.style.display = match ? "" : "none";
                if (match) visible++;
            });

            if (!term) {
                result.textContent = `A mostrar ${visible} cursos.`;
            } else if (visible === 0) {
                result.textContent = "Nenhum curso encontrado.";
            } else {
                result.textContent = `${visible} curso(s) encontrado(s).`;
            }
        };

        input.addEventListener("input", filterCourses);
        filterCourses();
    }

    /* =====================================================
       5. FORMULÁRIO DE CONTACTO — 100% ESTÁTICO
       Validação em JS, sem backend. Guarda no localStorage.
    ====================================================== */
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const status = document.getElementById("contact-status");
            const button = contactForm.querySelector("button[type='submit']");
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            const nome = String(data.nome || "").trim();
            const email = String(data.email || "").trim();
            const mensagem = String(data.mensagem || "").trim();

            if (status) status.textContent = "A enviar mensagem...";
            if (button) button.disabled = true;

            const erro = !nome || !email || !mensagem
                ? "Preencha todos os campos obrigatórios."
                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    ? "Introduza um endereço de e-mail válido."
                    : mensagem.length < 10
                        ? "A mensagem deve ter pelo menos 10 caracteres."
                        : null;

            if (erro) {
                if (status) status.textContent = erro;
                if (button) button.disabled = false;
                return;
            }

            try {
                const guardadas = JSON.parse(localStorage.getItem("mensagens-contacto") || "[]");
                guardadas.push({ ...data, data: new Date().toISOString() });
                localStorage.setItem("mensagens-contacto", JSON.stringify(guardadas));
            } catch (e) { /* localStorage indisponível: ignora */ }

            if (status) status.textContent = "Mensagem recebida com sucesso. Obrigado pelo contacto!";
            contactForm.reset();
            if (button) button.disabled = false;
        });
    }

    /* =====================================================
       6. FORMULÁRIO DE CANDIDATURA — 100% ESTÁTICO
    ====================================================== */
    const CURSOS_VALIDOS = [
        "engenharia-florestal",
        "medicina-geral",
        "geologia-e-minas",
        "antropologia",
        "engenharia-eletrica",
        "ciencia-da-computacao",
        "engenharia-mecanica"
    ];
    const applicationForm = document.getElementById("application-form");
    if (applicationForm) {
        let status = document.getElementById("application-status");
        if (!status) {
            status = document.createElement("p");
            status.id = "application-status";
            status.className = "form-status";
            status.setAttribute("role", "status");
            status.setAttribute("aria-live", "polite");
            applicationForm.appendChild(status);
        }

        applicationForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const button = applicationForm.querySelector("button[type='submit']");
            const formData = new FormData(applicationForm);
            const data = Object.fromEntries(formData.entries());
            const nome = String(data.nome || "").trim();
            const email = String(data.email || "").trim();
            const curso = String(data.curso || "").trim();

            status.textContent = "A enviar candidatura...";
            if (button) button.disabled = true;

            const erro = !nome || !email || !curso
                ? "Preencha o nome, e-mail e curso."
                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    ? "Introduza um endereço de e-mail válido."
                    : !CURSOS_VALIDOS.includes(curso)
                        ? "Selecione um curso válido."
                        : null;

            if (erro) {
                status.textContent = erro;
                if (button) button.disabled = false;
                return;
            }

            try {
                const guardadas = JSON.parse(localStorage.getItem("candidaturas") || "[]");
                guardadas.push({ ...data, data: new Date().toISOString() });
                localStorage.setItem("candidaturas", JSON.stringify(guardadas));
            } catch (e) { /* localStorage indisponível: ignora */ }

            status.textContent = "Candidatura recebida com sucesso. Boa sorte!";
            applicationForm.reset();
            if (button) button.disabled = false;
        });
    }

    /* =====================================================
       7. ESC FECHA MENU
    ====================================================== */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menuButton && mainNav) {
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Abrir menu");
            mainNav.classList.remove("is-open");
            menuButton.focus();
        }
    });
});
