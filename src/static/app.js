document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Genereer initialen uit een string (naam of email)
  function initials(email) {
    if (!email) return "?";
    const local = String(email).split("@")[0] || "";
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length === 0) return local.slice(0, 2).toUpperCase();
    return parts.map(p => p[0]).join("").slice(0,2).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants" aria-label="Deelnemers">
            <h5>Deelnemers <span class="participant-count"></span></h5>
            <ul class="participant-list"></ul>
            <div class="participants-empty hidden">Nog geen deelnemers</div>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Deelnemers renderen
        const listEl = activityCard.querySelector(".participant-list");
        const emptyEl = activityCard.querySelector(".participants-empty");
        const countEl = activityCard.querySelector(".participant-count");
        const participants = Array.isArray(details.participants) ? details.participants : [];

        if (!participants.length) {
          if (listEl) listEl.innerHTML = "";
          if (emptyEl) emptyEl.classList.remove("hidden");
          if (countEl) countEl.textContent = "0";
        } else {
          if (emptyEl) emptyEl.classList.add("hidden");
          if (countEl) countEl.textContent = String(participants.length);

          if (listEl) {
            listEl.innerHTML = participants.map(email => {
              const local = String(email).split("@")[0] || "onbekend";
              const nameParts = local.split(/[._-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1));
              const displayName = nameParts.join(" ");
              const avatar = initials(email);
              return `
                <li class="participant-item">
                  <span class="participant-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
                  <span class="participant-name">${escapeHtml(displayName)}</span>
                  <button class="delete-participant" title="Verwijder deelnemer" data-email="${escapeHtml(email)}" aria-label="Verwijder ${escapeHtml(displayName)}">🗑️</button>
                </li>
              `;
            }).join("");
            // Voeg event listeners toe voor delete-knoppen
            listEl.querySelectorAll('.delete-participant').forEach(btn => {
              btn.addEventListener('click', async (e) => {
                const email = btn.getAttribute('data-email');
                // Vind de activity naam
                const card = btn.closest('.activity-card');
                const title = card.querySelector('h4');
                const activityName = title ? title.textContent : null;
                if (!activityName || !email) return;
                if (!confirm(`Weet je zeker dat je ${email} wilt verwijderen uit ${activityName}?`)) return;
                try {
                  const response = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
                    method: 'DELETE',
                  });
                  const result = await response.json();
                  if (response.ok) {
                    fetchActivities();
                  } else {
                    alert(result.detail || 'Kon deelnemer niet verwijderen.');
                  }
                } catch (err) {
                  alert('Fout bij verwijderen deelnemer.');
                }
              });
            });
          }
        }
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
