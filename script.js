
(function () {
  "use strict";

  var THEME_KEY = "portfolio-theme";
  var html = document.documentElement;
  var themeToggle = document.getElementById("theme-toggle");
  var navToggle = document.getElementById("nav-toggle");
  var primaryNav = document.getElementById("primary-nav");
  var searchInput = document.getElementById("project-search");
  var cards = document.querySelectorAll(".project-card");
  var noResults = document.getElementById("no-results");
  var searchStatus = document.getElementById("search-status");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var chatLog = document.getElementById("chat-log");
  var year = document.getElementById("year");

  // Update footer year.
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // Theme management.
  function preferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);

      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (error) {
      // Continue with the system preference if storage is unavailable.
    }

    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);

    var isDark = theme === "dark";

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
      themeToggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );

      var icon = themeToggle.querySelector(".theme-toggle-icon");
      var text = themeToggle.querySelector(".theme-toggle-text");

      if (icon) {
        icon.textContent = isDark ? "☀️" : "🌙";
      }

      if (text) {
        text.textContent = isDark ? "Light" : "Dark";
      }
    }
  }

  applyTheme(preferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next =
        html.getAttribute("data-theme") === "dark" ? "light" : "dark";

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        // The theme still works for this page even if storage is unavailable.
      }

      applyTheme(next);
    });
  }

  // Mobile navigation.
  function setMenuOpen(open) {
    if (!primaryNav || !navToggle) {
      return;
    }

    primaryNav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute(
      "aria-label",
      open ? "Close menu" : "Open menu"
    );
  }

  window.togglePrimaryNav = function () {
    if (!navToggle) {
      return;
    }

    var open = navToggle.getAttribute("aria-expanded") !== "true";
    setMenuOpen(open);
  };

  if (primaryNav) {
    var navLinks = primaryNav.getElementsByTagName("a");

    for (var i = 0; i < navLinks.length; i += 1) {
      navLinks[i].addEventListener("click", function () {
        setMenuOpen(false);
      });
    }
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  // Project search and filtering.
  function filterProjects() {
    if (!searchInput) {
      return;
    }

    var query = searchInput.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var haystack = [
        card.getAttribute("data-title") || "",
        card.getAttribute("data-description") || "",
        card.getAttribute("data-tech") || ""
      ].join(" ").toLowerCase();

      var match = query === "" || haystack.indexOf(query) !== -1;

      card.hidden = !match;

      if (match) {
        visible += 1;
      }
    });

    if (noResults) {
      noResults.hidden = visible !== 0;
    }

    if (searchStatus) {
      if (query === "") {
        searchStatus.textContent =
          "Showing all " + cards.length + " projects.";
      } else if (visible === 0) {
        searchStatus.textContent =
          'No projects found for "' + query + '".';
      } else {
        searchStatus.textContent =
          "Showing " + visible + " of " + cards.length + " projects.";
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterProjects);
    filterProjects();
  }

  // Safely create chat messages.
  function addChatBubble(text, who) {
    if (!chatLog) {
      return null;
    }

    var bubble = document.createElement("p");
    bubble.className = "chat-bubble " + who;
    bubble.textContent = text;

    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;

    return bubble;
  }

  // Call your backend. The API key must remain on the server.
  async function getAIReply(message) {
    var response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message
      })
    });

    var data;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(
        data && data.error
          ? data.error
          : "The AI service could not process your request."
      );
    }

    if (!data || typeof data.reply !== "string") {
      throw new Error("The server did not return a valid AI reply.");
    }

    return data.reply;
  }

  // Chat form submission.
  if (chatForm && chatInput) {
    var isSending = false;

    chatForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      var message = chatInput.value.trim();

      if (!message || isSending) {
        return;
      }

      addChatBubble(message, "user");
      chatInput.value = "";
      isSending = true;

      var sendButton = chatForm.querySelector(
        'button[type="submit"], input[type="submit"]'
      );

      if (sendButton) {
        sendButton.disabled = true;
      }

      var loadingBubble = addChatBubble(
        "Thinking...",
        "bot"
      );

      try {
        var reply = await getAIReply(message);

        if (loadingBubble) {
          loadingBubble.textContent = reply;
        } else {
          addChatBubble(reply, "bot");
        }
      } catch (error) {
        console.error("Chatbot error:", error);

        var errorMessage =
          error instanceof TypeError
            ? "Could not connect to the chatbot server. Check your API route and deployment."
            : error.message;

        if (loadingBubble) {
          loadingBubble.textContent = errorMessage;
        } else {
          addChatBubble(errorMessage, "bot");
        }
      } finally {
        isSending = false;

        if (sendButton) {
          sendButton.disabled = false;
        }

        chatInput.focus();

        if (chatLog) {
          chatLog.scrollTop = chatLog.scrollHeight;
        }
      }
    });
  }
})();

