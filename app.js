const { useEffect, useMemo, useState } = React;

const BASE_SERVICES = [
  { id: 1, name: "Mantenimiento preventivo", category: "Mantenimiento", price: "Desde $50.000", description: "Limpieza interna, pasta térmica y revisión completa para que rinda como el primer día." },
  { id: 2, name: "Reparación y formateo", category: "Mantenimiento", price: "Desde $60.000", description: "Instalación de sistema, programas y respaldo de tu información." },
  { id: 3, name: "Redes y WiFi", category: "Mantenimiento", price: "Desde $80.000", description: "Cobertura estable en casa u oficina, configuración y seguridad." },
  { id: 4, name: "Recuperación de datos", category: "Mantenimiento", price: "Cotización", description: "Rescatamos archivos de discos y memorias dañadas." },
  { id: 5, name: "Páginas web", category: "Desarrollo", price: "Desde $600.000", description: "Sitios rápidos, responsive y con tu identidad de marca." },
  { id: 6, name: "Aplicaciones a la medida", category: "Desarrollo", price: "Cotización", description: "Sistemas de inventario, reservas o gestión hechos para tu negocio." },
  { id: 7, name: "Tiendas en línea", category: "Desarrollo", price: "Desde $1.200.000", description: "Catálogo, carrito y panel para administrar tus productos." },
  { id: 8, name: "Automatización con IA", category: "Desarrollo", price: "Cotización", description: "Chatbots y flujos que atienden a tus clientes por ti." }
];

const galleryItems = [
  { title: "Diagnóstico y reparación", description: "Mantenimiento de equipos con pruebas de rendimiento y limpieza profesional.", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80" },
  { title: "Configuración de redes", description: "WiFi y estructura de red para hogares y negocios con mejor cobertura.", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80" },
  { title: "Desarrollo web", description: "Diseños modernos, rápidos y pensados para convertir visitas en clientes.", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80" },
  { title: "Software a medida", description: "Flujos y paneles diseñados para tu operación real y tus objetivos.", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80" }
];

const legalNotices = {
  privacy: {
    title: "Aviso de privacidad",
    paragraphs: [
      "Cuando envías el formulario de contacto o una cotización, el nombre, correo, servicio y mensaje o selección se guardan en una base de datos PostgreSQL para que ZYNALIX pueda atender la solicitud. El catálogo de servicios también se almacena allí.",
      "El chat responde con opciones predefinidas sobre los servicios y no guarda la conversación.",
      "Las fuentes tipográficas se cargan desde Google Fonts y el enlace de ubicación abre Google Maps. Esos servicios externos pueden recibir datos técnicos de tu conexión cuando los visitas.",
      "Este aviso describe el comportamiento técnico actual y no reemplaza una política legal revisada para el negocio. Antes de publicar el sitio, agrega los datos del responsable del tratamiento y valida la política aplicable."
    ]
  },
  terms: {
    title: "Términos y condiciones",
    paragraphs: [
      "Los servicios y precios mostrados son informativos. El cotizador presenta una estimación; el alcance, el precio final y el plazo deben confirmarse antes de iniciar cualquier trabajo.",
      "Las solicitudes de contacto y cotizaciones enviadas se guardan en PostgreSQL para que ZYNALIX pueda gestionarlas. El chat ofrece respuestas predefinidas y no envía tus preguntas a servicios de IA.",
      "El uso de enlaces externos, como Google Maps y Google Fonts, está sujeto a las condiciones de sus respectivos proveedores.",
      "Esta página aún no sustituye los términos legales definitivos del negocio. Antes de recibir solicitudes reales, se debe conectar un canal de atención y publicar la información legal correspondiente."
    ]
  }
};

function api(url, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  };

  return fetch(url, requestOptions).then(async response => {
    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo completar la solicitud.");
    }

    return payload;
  });
}

function formatMoney(value) {
  const numericValue = Number(String(value).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(numericValue)) return value;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(numericValue);
}

function App() {
  const [services, setServices] = useState(BASE_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("zynalix-theme");
    if (storedTheme) return storedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [terminalLines, setTerminalLines] = useState(["$ zynalix --diagnostico"]);
  const [quoteSelection, setQuoteSelection] = useState({});
  const [quoteModality, setQuoteModality] = useState("remote");
  const [quotePriority, setQuotePriority] = useState("normal");
  const [quoteName, setQuoteName] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quoteFeedback, setQuoteFeedback] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", service: "", message: "" });
  const [contactFeedback, setContactFeedback] = useState({ type: "", message: "" });
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [adminFeedback, setAdminFeedback] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeLegalNotice, setActiveLegalNotice] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("zynalix-theme", theme);
  }, [theme]);

  useEffect(() => {
    const animationLines = [
      "$ zynalix --diagnostico",
      "<span class=d>Revisando disco…</span> <span class=ok>OK</span>",
      "<span class=d>Temperatura CPU…</span> <span class=ok>OK</span>",
      "<span class=d>Memoria RAM…</span> <span class=ok>OK</span>",
      "<span class=d>Compilando tu idea…</span>",
      "<span class=ok>✓ Todo listo. ¿Empezamos?</span>"
    ];

    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      if (index < animationLines.length) {
        setTerminalLines(prev => [...prev, animationLines[index]]);
      } else {
        setTerminalLines(animationLines);
        clearInterval(timer);
      }
    }, 650);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api("/api/services")
      .then(result => {
        if (Array.isArray(result.services)) {
          setServices(result.services);
        }
      })
      .catch(() => {
        setServices(BASE_SERVICES);
      });
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-number]");
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const countNode = entry.target;
        if (countNode.dataset.counted === "true") return;
        countNode.dataset.counted = "true";
        const targetValue = Number(countNode.dataset.number || 0);
        let currentValue = 0;
        const step = setInterval(() => {
          currentValue += Math.max(1, Math.ceil(targetValue / 28));
          if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(step);
          }
          countNode.textContent = currentValue;
        }, 30);
      });
    }, { threshold: 0.2 });

    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [services]);

  const categories = useMemo(() => ["Todos", ...new Set(services.map(service => service.category))], [services]);
  const visibleServices = selectedCategory === "Todos" ? services : services.filter(service => service.category === selectedCategory);

  const selectedServices = services.filter(service => Number(quoteSelection[service.id] || 0) > 0);
  const subtotal = selectedServices.reduce((total, service) => {
    const servicePrice = Number(String(service.price).replace(/[^0-9]/g, ""));
    const quantity = Number(quoteSelection[service.id] || 0);
    return total + (Number.isFinite(servicePrice) ? servicePrice * quantity : 0);
  }, 0);
  const quoteTotal = subtotal * (quotePriority === "urgent" ? 1.2 : 1) + (quoteModality === "onsite" ? 30000 : 0);

  function toggleService(serviceId) {
    setQuoteSelection(prev => ({
      ...prev,
      [serviceId]: prev[serviceId] ? 0 : 1
    }));
  }

  async function handleQuoteSubmit(event) {
    event.preventDefault();
    const items = Object.entries(quoteSelection)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([serviceId, quantity]) => ({
        serviceId: Number(serviceId),
        quantity: Number(quantity)
      }));

    if (!items.length) {
      setQuoteFeedback("Selecciona al menos un servicio para estimar tu presupuesto.");
      return;
    }

    if (!quoteName.trim() || !quoteEmail.trim()) {
      setQuoteFeedback("Escribe tu nombre y correo para enviar la cotización.");
      return;
    }

    try {
      const result = await api("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          name: quoteName.trim(),
          email: quoteEmail.trim(),
          items,
          modality: quoteModality,
          priority: quotePriority
        })
      });
      setQuoteFeedback(`Cotización enviada. Estimado total: ${formatMoney(result.estimatedTotal)}.`);
    } catch (error) {
      setQuoteFeedback(error.message);
    }
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    const isValidName = contactForm.name.trim().length >= 3;
    const isValidEmail = /^\S+@\S+\.\S+$/.test(contactForm.email);
    const isValidMessage = contactForm.message.trim().length >= 10;

    if (!isValidName || !isValidEmail || !isValidMessage) {
      setContactFeedback({
        type: "error",
        message: "Revisa los datos del formulario: nombre, correo y mensaje son obligatorios."
      });
      return;
    }

    try {
      await api("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          service: contactForm.service,
          message: contactForm.message.trim()
        })
      });
      setContactForm({ name: "", email: "", service: "", message: "" });
      setContactFeedback({
        type: "success",
        message: "¡Gracias! Guardamos tu solicitud y te escribiremos pronto."
      });
    } catch (error) {
      setContactFeedback({ type: "error", message: error.message });
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: adminForm.username,
          password: adminForm.password
        })
      });
      setAdminFeedback("Sesión iniciada correctamente.");
      setAdminOpen(false);
    } catch (error) {
      setAdminFeedback(error.message);
    }
  }

  function openLegalNotice(key) {
    setActiveLegalNotice(legalNotices[key]);
  }

  return (
    <>
      <header>
        <div className="w">
          <nav>
            <a className="logo" href="#inicio" aria-label="ZYNALIX, inicio">
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect x="1.5" y="1.5" width="37" height="37" rx="11" stroke="var(--ol)" strokeWidth="2" />
                <path d="M12 13h16L12 27h16" stroke="var(--ol)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="11" r="2.2" fill="var(--acc)" />
              </svg>
              <span>
                ZYNALIX
                <small>TECNOLOGÍA Y SOFTWARE</small>
              </span>
            </a>

            <div className="links" id="lk">
              <a href="#nosotros">Quiénes somos</a>
              <a href="#servicios">Servicios</a>
              <a href="#cotizador">Cotizador</a>
              <a href="#galeria">Galería</a>
              <a href="#ubicacion">Ubicación</a>
              <a href="#contacto">Contacto</a>
              <button type="button" className="btn g" onClick={() => setAdminOpen(true)} style={{ padding: "9px 20px" }}>
                Panel
              </button>
              <button type="button" className="ib" id="th" title="Cambiar tema" aria-label="Cambiar tema" onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}>
                ◐
              </button>
            </div>

            <button className="ib" type="button" aria-label="Abrir menú" style={{ width: "44px", height: "44px", borderColor: "var(--ol)", color: "var(--ol)" }} onClick={() => document.getElementById("lk").classList.toggle("on")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      <main id="inicio">
        <div className="hero">
          <div className="w">
            <div>
              <p className="kick" style={{ color: "#c3d27a" }}>Soporte técnico · Software a la medida</p>
              <h1>
                Tu tecnología, <em>siempre en marcha.</em>
              </h1>
              <p className="lead">Cuidamos tus equipos y construimos el software que tu negocio necesita. Un solo equipo, de la reparación a la aplicación.</p>
              <a className="btn" href="#cotizador" style={{ background: "#c3d27a", borderColor: "#c3d27a", color: "#2f3a1d" }}>
                Cotizar ahora
              </a>
              <a className="btn g" href="#servicios" style={{ marginLeft: "8px" }}>
                Ver servicios
              </a>
            </div>

            <div className="term">
              <div className="bar">
                <b></b>
                <b></b>
                <b></b>
              </div>
              <pre>{terminalLines.join("\n")}{"▍"}</pre>
            </div>
          </div>
        </div>

        <div className="w">
          <div className="stats rv">
            <div>
              <b data-number="350">0</b>
              <span>equipos revividos</span>
            </div>
            <div>
              <b data-number="40">0</b>
              <span>proyectos de software</span>
            </div>
            <div>
              <b data-number="24">0</b>
              <span>horas de respuesta máx.</span>
            </div>
            <div>
              <b data-number="98">0</b>
              <span>% clientes que repiten</span>
            </div>
          </div>
        </div>

        <section id="nosotros" className="alt">
          <div className="w ab">
            <div className="rv">
              <p className="kick">Quiénes somos</p>
              <h2>
                Tecnología con <em>criterio</em> y cercanía
              </h2>
              <p>
                ZYNALIX es un emprendimiento que une dos mundos que casi siempre van separados: el cuidado de tus equipos y la creación de software. Así no tienes que buscar un proveedor para reparar tu computador y otro para construir tu aplicación.
              </p>
              <p>
                Trabajamos con personas, familias y negocios que necesitan que su tecnología funcione, y que les expliquen las cosas en palabras claras.
              </p>
            </div>

            <div className="pil rv">
              <div>
                <b>Misión</b>
                <span>Mantener la tecnología de nuestros clientes en marcha y crear software que haga crecer sus negocios.</span>
              </div>
              <div>
                <b>Visión</b>
                <span>Ser el aliado tecnológico de confianza de los emprendimientos de la región.</span>
              </div>
              <div>
                <b>Valores</b>
                <span>Transparencia en cada precio, precisión técnica y un trato cercano.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios">
          <div className="w">
            <p className="kick rv">Catálogo</p>
            <h2 className="rv">
              Lo que hacemos, <em>bien hecho</em>
            </h2>

            <div className="tabs">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`tab ${selectedCategory === category ? "on" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid">
              {visibleServices.map((service, index) => (
                <article className="card" key={service.id || service.name} style={{ animationDelay: `${index * 60}ms` }}>
                  <span className="n">0{index + 1}</span>
                  <span className="t">{service.category}</span>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <div className="f">
                    <span>{service.price}</span>
                    <button type="button" onClick={() => toggleService(service.id)}>
                      {quoteSelection[service.id] ? "Seleccionado" : "Cotizar →"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cotizador" className="alt">
          <div className="w">
            <p className="kick rv">Cotizador</p>
            <h2 className="rv">
              Calcula tu <em>presupuesto</em>
            </h2>
            <p className="rv" style={{ color: "var(--mut)", maxWidth: "560px", marginTop: "10px" }}>
              Elige lo que necesitas y obtén un valor estimado al instante. Un técnico lo confirma en menos de 24 horas.
            </p>

            <div className="qg rv">
              <div id="ql">
                {services.map(service => (
                  <label key={service.id} className="quote-row">
                    <input
                      type="checkbox"
                      checked={Boolean(quoteSelection[service.id])}
                      onChange={() => toggleService(service.id)}
                    />
                    <span>{service.name}</span>
                    <strong>{service.price}</strong>
                  </label>
                ))}
              </div>

              <aside className="qs">
                <h3>Tu estimado</h3>
                <div id="qd">
                  {selectedServices.length ? (
                    selectedServices.map(service => (
                      <div key={service.id} className="quote-selected-item">
                        <span>{service.name}</span>
                        <strong>x{quoteSelection[service.id] || 0}</strong>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "var(--mut)" }}>Aún no has seleccionado servicios.</p>
                  )}
                </div>
                <div className="qt">{formatMoney(quoteTotal)}</div>

                <form onSubmit={handleQuoteSubmit}>
                  <label>
                    Modalidad
                    <select value={quoteModality} onChange={event => setQuoteModality(event.target.value)}>
                      <option value="remote">Remoto (sin costo)</option>
                      <option value="onsite">En sitio (+$30.000)</option>
                    </select>
                  </label>

                  <label>
                    Prioridad
                    <select value={quotePriority} onChange={event => setQuotePriority(event.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgente (+20%)</option>
                    </select>
                  </label>

                  <label>
                    Nombre
                    <input value={quoteName} onChange={event => setQuoteName(event.target.value)} autoComplete="name" />
                  </label>

                  <label>
                    Correo
                    <input type="email" value={quoteEmail} onChange={event => setQuoteEmail(event.target.value)} autoComplete="email" />
                  </label>

                  <span className="er" id="qr2">{quoteFeedback}</span>
                  <button className="btn" type="submit">
                    Solicitar cotización
                  </button>
                </form>
              </aside>
            </div>
          </div>
        </section>

        <section id="proceso">
          <div className="w">
            <p className="kick rv">Cómo trabajamos</p>
            <h2 className="rv">
              Un proceso claro, <em>sin sorpresas</em>
            </h2>

            <div className="steps rv">
              <div>
                <h3>Escuchamos</h3>
                <p>Entendemos el problema o la idea antes de tocar nada.</p>
              </div>
              <div>
                <h3>Diagnosticamos</h3>
                <p>Revisión técnica y cotización transparente.</p>
              </div>
              <div>
                <h3>Ejecutamos</h3>
                <p>Reparamos o desarrollamos con avances que puedes ver.</p>
              </div>
              <div>
                <h3>Acompañamos</h3>
                <p>Entrega, capacitación y soporte posterior.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="galeria" className="alt">
          <div className="w">
            <p className="kick rv">Galería</p>
            <h2 className="rv">
              Nuestro trabajo, <em>de cerca</em>
            </h2>
            <p className="rv" style={{ color: "var(--mut)", maxWidth: "560px", marginTop: "10px" }}>
              Una muestra de lo que hacemos en taller, en sitio y en pantalla. Toca cualquier imagen para verla en grande.
            </p>

            <div className="gal rv">
              {galleryItems.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className="gal-item"
                  style={{ backgroundImage: `url(${item.image})` }}
                  aria-label={item.title}
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {lightboxOpen && (
          <div className="ov on" id="lb" onClick={event => event.target === event.currentTarget && setLightboxOpen(false)}>
            <div className="box" style={{ maxWidth: "640px" }}>
              <div className="lbx" style={{ backgroundImage: `url(${galleryItems[lightboxIndex].image})` }}></div>
              <h3>{galleryItems[lightboxIndex].title}</h3>
              <p style={{ color: "var(--mut)" }}>{galleryItems[lightboxIndex].description}</p>
              <div className="lbn">
                <button type="button" className="btn g" onClick={() => setLightboxIndex(prev => (prev === 0 ? galleryItems.length - 1 : prev - 1))}>
                  ← Anterior
                </button>
                <button type="button" className="btn g" onClick={() => setLightboxOpen(false)}>
                  Cerrar
                </button>
                <button type="button" className="btn g" onClick={() => setLightboxIndex(prev => (prev + 1) % galleryItems.length)}>
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        )}

        <section id="ubicacion">
          <div className="w loc">
            <div className="rv">
              <p className="kick">Ubicación</p>
              <h2>
                Encuéntranos <em>fácil</em>
              </h2>
              <dl>
                <div>
                  <dt>Ciudad</dt>
                  <dd>Cartagena, Bolívar, Colombia</dd>
                </div>
                <div>
                  <dt>Horario</dt>
                  <dd>
                    Lunes a viernes, 8:00 a. m. a 6:00 p. m.
                    <br />
                    Sábados, 9:00 a. m. a 1:00 p. m.
                  </dd>
                </div>
                <div>
                  <dt>Cobertura</dt>
                  <dd>Servicio en sitio en el área metropolitana y soporte remoto en todo el país.</dd>
                </div>
              </dl>
              <a className="btn" style={{ marginTop: "26px" }} target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Cartagena%2C%20Bol%C3%ADvar">
                Cómo llegar →
              </a>
            </div>

            <figure className="mp rv">
              <svg viewBox="0 0 600 400" role="img" aria-label="Mapa de ubicación en Cartagena">
                <rect className="bg" width="600" height="400" />
                <path className="rr" d="M-10 310C120 270 200 350 330 310S520 260 620 300" />
                <ellipse className="pk" cx="120" cy="110" rx="80" ry="50" />
                <ellipse className="pk" cx="500" cy="90" rx="50" ry="36" />
                <g className="rd">
                  <path strokeWidth="16" d="M0 190H600" />
                  <path strokeWidth="16" d="M330 0V400" />
                  <path strokeWidth="10" d="M0 90H600M0 270H600M180 0V400M470 0V400" />
                  <path strokeWidth="7" d="M0 140H330M330 235H600M250 0V190M400 190V400M90 190V400M540 0V190" />
                  <path strokeWidth="12" d="M0 380L600 20" />
                </g>
                <circle className="pl" cx="330" cy="212" r="10" />
                <path className="pn" d="M330 215c-14-16-22-27-22-39a22 22 0 0144 0c0 12-8 23-22 39z" />
                <circle className="pc" cx="330" cy="176" r="8" />
              </svg>
              <figcaption>ZYNALIX · Cartagena</figcaption>
            </figure>
          </div>
        </section>

        <section id="contacto" className="alt">
          <div className="w ct">
            <div className="rv">
              <p className="kick">Contacto</p>
              <h2>
                Hablemos de tu <em>proyecto</em>
              </h2>
              <ul>
                <li>Atención en Cartagena y de forma remota</li>
                <li>Respuesta en menos de 24 horas</li>
                <li>Diagnóstico inicial sin costo</li>
              </ul>
            </div>

            <form className="rv" onSubmit={handleContactSubmit} noValidate>
              <label>
                Nombre
                <input value={contactForm.name} onChange={event => setContactForm({ ...contactForm, name: event.target.value })} autoComplete="name" />
                <span className="er"></span>
              </label>

              <label>
                Correo
                <input type="email" value={contactForm.email} onChange={event => setContactForm({ ...contactForm, email: event.target.value })} autoComplete="email" />
                <span className="er"></span>
              </label>

              <label>
                Servicio
                <select value={contactForm.service} onChange={event => setContactForm({ ...contactForm, service: event.target.value })}>
                  <option value="">Selecciona un servicio</option>
                  {services.map(service => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Mensaje
                <textarea value={contactForm.message} onChange={event => setContactForm({ ...contactForm, message: event.target.value })} rows="5"></textarea>
                <span className="er"></span>
              </label>

              <button className="btn" type="submit">
                Enviar mensaje
              </button>

              {contactFeedback.message && (
                <div className={`msg ${contactFeedback.type === "error" ? "error" : ""}`}>
                  {contactFeedback.message}
                </div>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="w" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <strong>ZYNALIX</strong>
            <span> © 2025 · Cartagena, Colombia</span>
          </div>
          <div className="footer-links">
            <button type="button" className="link-button" onClick={() => openLegalNotice("privacy")}>Privacidad</button>
            <button type="button" className="link-button" onClick={() => openLegalNotice("terms")}>Términos</button>
          </div>
        </div>
      </footer>

      {adminOpen && (
        <div className="ov on" onClick={event => event.target === event.currentTarget && setAdminOpen(false)}>
          <div className="box" style={{ maxWidth: "460px" }}>
            <button type="button" className="close-button" onClick={() => setAdminOpen(false)} aria-label="Cerrar panel administrativo">×</button>
            <h3>Panel administrativo</h3>
            <form onSubmit={handleAdminLogin}>
              <label>
                Usuario
                <input value={adminForm.username} onChange={event => setAdminForm({ ...adminForm, username: event.target.value })} />
              </label>
              <label>
                Contraseña
                <input type="password" value={adminForm.password} onChange={event => setAdminForm({ ...adminForm, password: event.target.value })} />
              </label>
              <button className="btn" type="submit">Ingresar</button>
              {adminFeedback && <div className="msg error">{adminFeedback}</div>}
            </form>
          </div>
        </div>
      )}

      {activeLegalNotice && (
        <div className="ov on" onClick={event => event.target === event.currentTarget && setActiveLegalNotice(null)}>
          <div className="box" style={{ maxWidth: "620px" }}>
            <button type="button" className="close-button" onClick={() => setActiveLegalNotice(null)} aria-label="Cerrar aviso legal">×</button>
            <h3>{activeLegalNotice.title}</h3>
            {activeLegalNotice.paragraphs.map((paragraph, index) => (
              <p key={index} style={{ color: "var(--mut)", marginTop: "12px" }}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
