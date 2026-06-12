      /* ═══════════════════════════════════════════════════════
   Fortis DB — Script
   Felix  : UI rendering (hero, carousel, detail modal)
   Fariz  : Data loading (AJAX/XML/JSON), search engine
   ═══════════════════════════════════════════════════════ */

      const App = {
        films: [],
        config: {},
        activeGenre: "all",
        searchQuery: "",
        heroIndex: 0,
        heroFilms: [],
        heroTimer: null,
        carouselOffset: 0,
        carouselStep: 3,
      };

      function showLoader() {
        setTimeout(() => {
          document.getElementById("loader-fill").style.width = "100%";
        }, 100);
        setTimeout(() => {
          document.getElementById("loading-screen").classList.add("hidden");
        }, 1800);
      }

      function showToast(msg) {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 2500);
      }

      function loadConfig() {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: "data/config.json",
            method: "GET",
            dataType: "json",
            success(data) {
              App.config = data;
              document.getElementById("stat-films").textContent =
                data.siteConfig.totalFilms;
              document.getElementById("stat-reviews").textContent =
                data.siteConfig.totalReviews.toLocaleString();
              document.getElementById("stat-users").textContent =
                data.siteConfig.totalUsers.toLocaleString();
              buildGenrePills(data.genres);
              resolve(data);
            },
            error() {
              reject(
                "Gagal memuat config.json (Pastikan Anda menggunakan Local Web Server)",
              );
            },
          });
        });
      }

      function loadFilms() {
        return new Promise((resolve, reject) => {
          $.ajax({
            url: "data/films.xml",
            method: "GET",
            dataType: "xml",
            success(xml) {
              const $films = $(xml).find("film");
              const parsed = [];
              $films.each(function () {
                const $f = $(this);
                const reviews = [];
                $f.find("review").each(function () {
                  reviews.push({
                    user: $(this).attr("user"),
                    score: parseInt($(this).attr("score")),
                    date: $(this).attr("date"),
                    text: $(this).text().trim(),
                  });
                });
                parsed.push({
                  id: parseInt($f.attr("id")),
                  title: $f.find("title").text(),
                  year: parseInt($f.find("year").text()),
                  genre: $f.find("genre").text(),
                  duration: parseInt($f.find("duration").text()),
                  director: $f.find("director").text(),
                  synopsis: $f.find("synopsis").text(),
                  rating: parseFloat($f.find("rating").text()),
                  votes: parseInt($f.find("votes").text()),
                  poster: $f.find("poster").text(),
                  trailer: $f.find("trailer").text(),
                  trending: $f.find("trending").text() === "true",
                  reviews: reviews,
                });
              });
              App.films = parsed;
              resolve(parsed);
            },
            error() {
              reject(
                "Gagal memuat films.xml (Pastikan Anda menggunakan Local Web Server)",
              );
            },
          });
        });
      }

      function buildGenrePills(genres) {
        const wrap = document.getElementById("genre-pills");
        wrap.innerHTML = genres
          .map(
            (g) => `
    <button class="genre-pill ${g.id === "all" ? "active" : ""}" data-genre="${g.id}">
      ${g.label}
    </button>
  `,
          )
          .join("");
        wrap.querySelectorAll(".genre-pill").forEach((btn) => {
          btn.addEventListener("click", () => {
            wrap
              .querySelectorAll(".genre-pill")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            App.activeGenre = btn.dataset.genre;
            App.searchQuery = "";
            document.getElementById("nav-search").value = "";
            renderGrid();
          });
        });
      }

      function initSearch() {
        const input = document.getElementById("nav-search");
        const suggestions = document.getElementById("search-suggestions");

        input.addEventListener("input", function () {
          const q = this.value.trim().toLowerCase();
          App.searchQuery = q;
          App.activeGenre = "all";
          document
            .querySelectorAll(".genre-pill")
            .forEach((b) => b.classList.remove("active"));
          document
            .querySelector('.genre-pill[data-genre="all"]')
            ?.classList.add("active");

          if (q.length < 2) {
            suggestions.classList.remove("show");
            suggestions.innerHTML = "";
            if (q.length === 0) renderGrid();
            return;
          }

          const matches = App.films
            .filter(
              (f) =>
                f.title.toLowerCase().includes(q) ||
                f.genre.toLowerCase().includes(q) ||
                f.director.toLowerCase().includes(q),
            )
            .slice(0, 5);

          if (matches.length === 0) {
            suggestions.classList.remove("show");
          } else {
            suggestions.innerHTML = matches
              .map(
                (f) => `
        <div class="suggestion-item" data-id="${f.id}">
          <img class="suggestion-poster" src="${f.poster}" alt="" loading="lazy"
               onerror="this.src='https://via.placeholder.com/32x48/1a1a2e/gold?text=?'">
          <div class="suggestion-info">
            <div class="suggestion-title">${f.title}</div>
            <div class="suggestion-meta">${f.year} · ${f.genre}</div>
          </div>
          <span style="color:var(--gold);font-size:0.75rem;font-weight:700">${f.rating}</span>
        </div>
      `,
              )
              .join("");
            suggestions.classList.add("show");
            suggestions.querySelectorAll(".suggestion-item").forEach((el) => {
              el.addEventListener("click", () => {
                const film = App.films.find(
                  (f) => f.id === parseInt(el.dataset.id),
                );
                if (film) openModal(film);
                suggestions.classList.remove("show");
                input.value = "";
                App.searchQuery = "";
                renderGrid();
              });
            });
          }
          renderGrid();
        });

        document.addEventListener("click", (e) => {
          if (!e.target.closest(".nav-search-wrap")) {
            suggestions.classList.remove("show");
          }
        });
      }

      function renderGrid() {
        const q = App.searchQuery.toLowerCase();
        const genre = App.activeGenre;
        let films = App.films;

        if (genre !== "all") films = films.filter((f) => f.genre === genre);
        if (q)
          films = films.filter(
            (f) =>
              f.title.toLowerCase().includes(q) ||
              f.genre.toLowerCase().includes(q) ||
              f.director.toLowerCase().includes(q),
          );

        const grid = document.getElementById("film-grid");
        document.getElementById("grid-count").textContent =
          `${films.length} film`;

        if (films.length === 0) {
          grid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-film"></i>
        <h4 style="color:var(--muted)">Film tidak ditemukan</h4>
        <p>Coba kata kunci atau genre lain.</p>
      </div>`;
          return;
        }

        grid.innerHTML = films.map((f) => renderCard(f)).join("");
        grid.querySelectorAll(".film-card").forEach((card) => {
          card.addEventListener("click", () => {
            const film = App.films.find(
              (f) => f.id === parseInt(card.dataset.id),
            );
            if (film) openModal(film);
          });
        });
      }

      function renderCard(film) {
        return `
    <div class="film-card" data-id="${film.id}">
      ${film.trending ? '<div class="film-card-badge">Trending</div>' : ""}
      <div class="film-card-rating">⭐ ${film.rating}</div>
      <img class="film-card-poster" src="${film.poster}" alt="${film.title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/200x300/1a1a2e/e8c96b?text=${encodeURIComponent(film.title)}'">
      <div class="film-card-overlay">
        <div class="film-card-info">
          <div class="film-card-title">${film.title}</div>
          <div class="film-card-meta">${film.year} · ${film.genre} · ${film.duration}m</div>
        </div>
      </div>
    </div>
  `;
      }

      function buildCarousel() {
        const trending = App.films.filter((f) => f.trending);
        App.heroFilms = trending;
        document.getElementById("trending-count").textContent =
          `${trending.length} film`;

        const track = document.getElementById("carousel-track");
        track.innerHTML = trending.map((f) => renderCard(f)).join("");
        track.querySelectorAll(".film-card").forEach((card) => {
          card.addEventListener("click", () => {
            const film = App.films.find(
              (f) => f.id === parseInt(card.dataset.id),
            );
            if (film) openModal(film);
          });
        });

        const cardW = 200 + 20;
        document
          .getElementById("carousel-prev")
          .addEventListener("click", () => {
            App.carouselOffset = Math.max(
              0,
              App.carouselOffset - App.carouselStep,
            );
            track.style.transform = `translateX(-${App.carouselOffset * cardW}px)`;
          });
        document
          .getElementById("carousel-next")
          .addEventListener("click", () => {
            const max = Math.max(0, trending.length - App.carouselStep);
            App.carouselOffset = Math.min(
              max,
              App.carouselOffset + App.carouselStep,
            );
            track.style.transform = `translateX(-${App.carouselOffset * cardW}px)`;
          });
      }

      function buildHero() {
        const banners = App.config.banners;
        if (!banners || !banners.length) return;

        const dots = document.getElementById("hero-dots");
        dots.innerHTML = banners
          .map(
            (_, i) => `
    <button class="hero-dot ${i === 0 ? "active" : ""}" data-i="${i}"></button>
  `,
          )
          .join("");
        dots.querySelectorAll(".hero-dot").forEach((d) => {
          d.addEventListener("click", () => setHero(parseInt(d.dataset.i)));
        });

        setHero(0);
        App.heroTimer = setInterval(() => {
          setHero((App.heroIndex + 1) % banners.length);
        }, 6000);

        document.getElementById("hero-cta").addEventListener("click", () => {
          const banner = banners[App.heroIndex];
          const film = App.films.find((f) => f.id === banner.filmId);
          if (film) openModal(film);
        });
      }

      function setHero(i) {
        const banners = App.config.banners;
        const banner = banners[i];
        const film = App.films.find((f) => f.id === banner.filmId);
        App.heroIndex = i;

        document.getElementById("hero-bg").style.backgroundImage = film
          ? `url('${film.poster}')`
          : banner.bg;

        document.getElementById("hero-title").textContent = banner.headline;
        document.getElementById("hero-sub").textContent = banner.sub;

        document.querySelectorAll(".hero-dot").forEach((d, idx) => {
          d.classList.toggle("active", idx === i);
        });
      }

      function openModal(film) {
        document.getElementById("modal-backdrop").style.backgroundImage =
          `url('${film.poster}')`;
        document.getElementById("modal-poster").src = film.poster;
        document.getElementById("modal-poster").alt = film.title;
        document.getElementById("modal-genre").textContent = film.genre;
        document.getElementById("modal-title").textContent = film.title;

        // Modal details injection
        document.getElementById("modal-details").innerHTML = `
    <span class="mr-3"><i class="fas fa-calendar-alt mr-1"></i> ${film.year}</span>
    <span class="mr-3"><i class="fas fa-clock mr-1"></i> ${film.duration} menit</span>
    <span><i class="fas fa-user mr-1"></i> ${film.director}</span>
  `;

        document.getElementById("modal-rating-num").textContent = film.rating;
        document.getElementById("modal-stars").innerHTML = renderStars(
          film.rating,
        );
        document.getElementById("modal-votes").textContent =
          `${film.votes.toLocaleString()} suara`;
        document.getElementById("modal-synopsis").textContent = film.synopsis;
        document.getElementById("modal-trailer").src =
          film.trailer + "?rel=0&modestbranding=1";

        const revWrap = document.getElementById("modal-reviews");
        revWrap.innerHTML =
          film.reviews.length === 0
            ? '<p class="text-muted small">Belum ada ulasan.</p>'
            : film.reviews
                .map(
                  (r) => `
        <div class="review-card mb-3">
          <div class="review-header d-flex align-items-center w-100 mb-2">
            <div class="review-avatar mr-2">${r.user[0].toUpperCase()}</div>
            <div>
              <div class="review-user">${r.user}</div>
              <div class="review-stars small">${renderStars(r.score)}</div>
            </div>
            <span class="review-score-badge ml-auto mr-2">${r.score}/10</span>
            <span class="review-date text-muted small">${formatDate(r.date)}</span>
          </div>
          <div class="review-text pl-1">${r.text}</div>
        </div>
      `,
                )
                .join("");

        const modal = document.getElementById("film-modal");
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
      }

      function closeModal() {
        document.getElementById("film-modal").classList.remove("show");
        document.getElementById("modal-trailer").src = "";
        document.body.style.overflow = "";
      }

      function renderStars(score) {
        const full = Math.floor(score / 2);
        const half = score % 2 >= 1 ? 1 : 0;
        const empty = 5 - full - half;
        return (
          '<i class="fas fa-star text-warning"></i>'.repeat(full) +
          (half ? '<i class="fas fa-star-half-alt text-warning"></i>' : "") +
          '<i class="far fa-star text-warning" style="opacity:0.3"></i>'.repeat(
            empty,
          )
        );
      }

      function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      window.addEventListener("scroll", () => {
        document
          .getElementById("main-nav")
          .classList.toggle("scrolled", window.scrollY > 300);
        const sections = ["hero", "trending", "catalogue"];
        let current = "hero";
        sections.forEach((id) => {
          const el = document.getElementById(id);
          if (el && window.scrollY >= el.offsetTop - 120) current = id;
        });
        document.querySelectorAll(".nav-links a").forEach((a) => {
          a.classList.toggle(
            "active",
            a.getAttribute("href") === "#" + current,
          );
        });
      });

      document
        .getElementById("modal-close")
        .addEventListener("click", closeModal);
      document.getElementById("film-modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("film-modal")) closeModal();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
      });

      async function init() {
        showLoader();
        try {
          await Promise.all([loadConfig(), loadFilms()]);
          buildHero();
          buildCarousel();
          renderGrid();
          initSearch();
          showToast("✅ Data film berhasil dimuat");
        } catch (err) {
          console.error(err);
          showToast("⚠️ " + err);
        }
      }

      $(document).ready(init);