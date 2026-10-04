const example = `Open-source AI models are becoming easier to run on everyday hardware. Smaller models can be useful for focused tasks because they are faster, cheaper, and easier to inspect than large hosted systems. However, local inference still requires users to manage model files, memory limits, and updates. The best choice depends on the sensitivity of the data, the quality required, and the hardware available.`;

const sourceText = document.querySelector("#sourceText");
const wordCount = document.querySelector("#wordCount");
const briefButton = document.querySelector("#briefButton");
const resultsSection = document.querySelector("#resultsSection");
const statusText = document.querySelector("#statusText");
const modelLabel = document.querySelector("#modelLabel");
const toast = document.querySelector("#toast");

sourceText.addEventListener("input", () => {
  const count = sourceText.value.trim() ? sourceText.value.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${count.toLocaleString()} word${count === 1 ? "" : "s"}`;
});

document.querySelector("#loadExample").addEventListener("click", () => {
  sourceText.value = example;
  sourceText.dispatchEvent(new Event("input"));
  sourceText.focus();
});

briefButton.addEventListener("click", async () => {
  const text = sourceText.value.trim();
  if (text.split(/\s+/).filter(Boolean).length < 20) {
    showToast("Paste at least 20 words so the brief has enough context.");
    sourceText.focus();
    return;
  }
  setBusy(true);
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:3b",
        stream: false,
        format: "json",
        prompt: `You are OpenBrief, a careful reading assistant. Analyze the text below. Return valid JSON only with exactly these keys: summary (string, 2-3 sentences), claims (array of exactly 3 concise strings that should be verified), questions (array of exactly 3 thoughtful questions). Do not invent facts not present in the source. Source text:\n\n${text}`,
      }),
    });
    if (!response.ok) throw new Error("Ollama is not available");
    const data = await response.json();
    renderBrief(JSON.parse(data.response), "Generated with Ollama · llama3.2:3b");
  } catch {
    renderBrief(makeDemoBrief(text), "Demo mode · connect Ollama for local inference");
    showToast("Ollama was not reachable, so a transparent demo brief is shown.");
  } finally {
    setBusy(false);
  }
});

function makeDemoBrief(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const clean = (value) => value.trim().replace(/\s+/g, " ");
  return {
    summary: clean(sentences.slice(0, 2).join(" ")) || "This text presents a set of ideas that deserve closer reading.",
    claims: [
      "Which sources or measurements support the central claims?",
      "What assumptions or constraints shape the recommendation?",
      "What evidence would change the conclusion?",
    ],
    questions: [
      "Who is most affected by the idea described here?",
      "What is missing from this explanation?",
      "What would a small real-world test look like?",
    ],
  };
}

function renderBrief(brief, label) {
  document.querySelector("#summary").textContent = brief.summary;
  document.querySelector("#claims").innerHTML = brief.claims.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  document.querySelector("#questions").innerHTML = brief.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  modelLabel.textContent = label;
  resultsSection.classList.remove("hidden");
  statusText.textContent = "Brief ready";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setBusy(busy) {
  briefButton.disabled = busy;
  briefButton.querySelector("span:first-child").textContent = busy ? "Building…" : "Build my brief";
  statusText.textContent = busy ? "Reading…" : "Ready";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

document.querySelector("#copyButton").addEventListener("click", async () => {
  const brief = `OPENBRIEF\n\n${document.querySelector("#summary").textContent}\n\nCLAIMS TO CHECK\n${[...document.querySelectorAll("#claims li")].map((item) => `- ${item.textContent}`).join("\n")}\n\nQUESTIONS\n${[...document.querySelectorAll("#questions li")].map((item) => `- ${item.textContent}`).join("\n")}`;
  await navigator.clipboard.writeText(brief);
  showToast("Brief copied to clipboard.");
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}
