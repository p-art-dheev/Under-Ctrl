// Gemma writes LaTeX inside JSON strings. Two things go wrong:
//  1. "\frac", "\theta", "\beta", "\nabla", "\right" are valid JSON escapes
//     (form feed, tab, backspace, newline, CR), so JSON.parse silently turns
//     them into control characters.
//  2. "\alpha", "\sum", "\(" are invalid escapes and make JSON.parse throw.
// repairJsonBackslashes() doubles backslashes that start a LaTeX command or an
// illegal escape, and leaves real escapes (\n, \", \\, \uXXXX) alone.

/** LaTeX commands whose first letter collides with a JSON escape (b f n r t u). */
const AMBIGUOUS = [
  "beta", "bar", "begin", "binom", "bigcup", "bigcap", "big", "bigg", "bmod", "boldsymbol", "bot", "bullet", "backslash", "because",
  "frac", "dfrac", "tfrac", "forall", "flat", "fbox",
  "nabla", "neq", "ne", "neg", "nu", "not", "notin", "ni", "newline", "nearrow", "nmid", "nless", "ngtr", "nolimits", "normalsize",
  "rho", "right", "rightarrow", "Rightarrow", "rangle", "rceil", "rfloor", "rm", "rightleftharpoons", "mathrm",
  "theta", "text", "textbf", "textit", "times", "to", "tau", "tan", "tanh", "top", "triangle", "tilde", "therefore", "tag", "tiny", "tbinom", "textrm",
  "uparrow", "upsilon", "uplus",
];
const AMBIGUOUS_RE = new RegExp(`\\\\\\\\|\\\\(${AMBIGUOUS.join("|")})(?![a-zA-Z])`, "g");

/** Fix LaTeX backslashes in raw model text before JSON.parse. */
export function repairJsonBackslashes(raw: string): string {
  return raw
    .replace(AMBIGUOUS_RE, (m, cmd) => (cmd ? `\\\\${cmd}` : m))
    // any other backslash that is not a valid JSON escape (\alpha, \sum, \(, \[, \{, \, ...)
    .replace(/\\\\|\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (m) => (m === "\\\\" ? m : "\\\\"));
}

/** True when `\n` at this position starts a LaTeX command (\nabla, \neq, \nu ...) rather than a newline. */
export const LATEX_N_COMMAND = /^\\n(?:abla|eq|e|u|ot|otin|i|mid|less|gtr|rightarrow|earrow|olimits)(?![a-zA-Z])/;
