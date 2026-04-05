(function () {
  const LOGIN_STORAGE = {
    loggedIn: "dashboard.loggedIn",
    userEmail: "dashboard.userEmail",
    role: "dashboard.role"
  };

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("loginEmail");
  const messageEl = document.getElementById("loginMessage");

  // Remember last user: pre-fill email from last successful sign-in
  if (emailInput) {
    try {
      const rawEmail = localStorage.getItem(LOGIN_STORAGE.userEmail);
      let lastEmail = rawEmail;
      if (typeof rawEmail === "string") {
        try {
          const parsed = JSON.parse(rawEmail);
          if (typeof parsed === "string") lastEmail = parsed;
        } catch (_) {}
      }
      if (lastEmail && typeof lastEmail === "string" && lastEmail.trim()) {
        emailInput.value = lastEmail.trim();
      }
    } catch (_) {}
  }

  function setMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.className = "login-message" + (type ? " " + type : "");
  }

  function setLoggedIn(email, role) {
    try {
      localStorage.setItem(LOGIN_STORAGE.loggedIn, "true");
      localStorage.setItem(LOGIN_STORAGE.userEmail, email);
      localStorage.setItem(LOGIN_STORAGE.role, role);
    } catch (e) {
      setMessage("Could not save login state.", "error");
      return false;
    }
    return true;
  }

  if (form && emailInput) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = String(emailInput.value || "").trim().toLowerCase();

      if (!email) {
        setMessage("Please enter your work email.", "error");
        emailInput.focus();
        return;
      }

      setMessage("Signing you in...");

      try {
        const response = await fetch("/api/auth/context?email=" + encodeURIComponent(email));
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Could not verify user. Try again.", "error");
          return;
        }

        const role = (data.user && data.user.role === "manager") ? "manager" : "employee";
        if (setLoggedIn(email, role)) {
          setMessage("Redirecting... (" + (role === "manager" ? "Manager" : "Engineer") + ")", "success");
          window.location.href = "/";
        }
      } catch (err) {
        setMessage("Network error. Check your connection and try again.", "error");
      }
    });
  }
})();
