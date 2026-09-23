// ─────────────────────────────────────────────────────────────
// ANTI-LATEX SANITIZER FOR CLEAN CHAT DISPLAY
// ─────────────────────────────────────────────────────────────

const mathSymbols: Array<[string, string]> = [
	// Grego maiúsculo
	['\\Gamma', 'Γ'], ['\\Delta', 'Δ'], ['\\Theta', 'Θ'], ['\\Lambda', 'Λ'],
	['\\Xi', 'Ξ'], ['\\Pi', 'Π'], ['\\Sigma', 'Σ'], ['\\Upsilon', 'Υ'],
	['\\Phi', 'Φ'], ['\\Psi', 'Ψ'], ['\\Omega', 'Ω'],
	// Grego minúsculo
	['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\delta', 'δ'],
	['\\epsilon', 'ε'], ['\\varepsilon', 'ε'], ['\\zeta', 'ζ'], ['\\eta', 'η'],
	['\\theta', 'θ'], ['\\vartheta', 'θ'], ['\\iota', 'ι'], ['\\kappa', 'κ'],
	['\\lambda', 'λ'], ['\\mu', 'μ'], ['\\nu', 'ν'], ['\\xi', 'ξ'],
	['\\pi', 'π'], ['\\varpi', 'ϖ'], ['\\rho', 'ρ'], ['\\varrho', 'ϱ'],
	['\\sigma', 'σ'], ['\\varsigma', 'ς'], ['\\tau', 'τ'], ['\\upsilon', 'υ'],
	['\\phi', 'φ'], ['\\varphi', 'ϕ'], ['\\chi', 'χ'], ['\\psi', 'ψ'],
	['\\omega', 'ω'],
	// Blackboard bold (conjuntos)
	['\\mathbb{R}', 'ℝ'], ['\\mathbb{C}', 'ℂ'], ['\\mathbb{N}', 'ℕ'],
	['\\mathbb{Z}', 'ℤ'], ['\\mathbb{Q}', 'ℚ'], ['\\mathbb{T}', '𝕋'],
	['\\mathbb{H}', 'ℍ'],
	// Operadores e relações
	['\\times', '×'], ['\\cdot', '·'], ['\\div', '÷'], ['\\pm', '±'], ['\\mp', '∓'],
	['\\circ', '∘'], ['\\bullet', '•'], ['\\star', '⋆'],
	['\\leq', '≤'], ['\\le', '≤'], ['\\geq', '≥'], ['\\ge', '≥'],
	['\\neq', '≠'], ['\\ne', '≠'], ['\\approx', '≈'], ['\\sim', '~'],
	['\\equiv', '≡'], ['\\propto', '∝'],
	['\\subset', '⊂'], ['\\subseteq', '⊆'], ['\\supset', '⊃'], ['\\supseteq', '⊇'],
	['\\in', '∈'], ['\\notin', '∉'], ['\\ni', '∋'],
	['\\cap', '∩'], ['\\cup', '∪'], ['\\vee', '∨'], ['\\wedge', '∧'],
	['\\oplus', '⊕'], ['\\otimes', '⊗'],
	// Cálculo & Análise
	['\\iiint', '∭'], ['\\iint', '∬'], ['\\int', '∫'], ['\\oint', '∮'],
	['\\nabla', '∇'], ['\\partial', '∂'], ['\\infty', '∞'], ['\\sqrt', '√'],
	['\\sum', '∑'], ['\\prod', '∏'],
	// Setas
	['\\leftarrow', '←'], ['\\rightarrow', '→'], ['\\to', '→'],
	['\\Leftarrow', '⇐'], ['\\Rightarrow', '⇒'], ['\\iff', '⇔'],
	['\\mapsto', '↦'],
	// Delimitadores & Outros
	['\\langle', '⟨'], ['\\rangle', '⟩'], ['\\forall', '∀'], ['\\exists', '∃'],
	['\\nexists', '∄'], ['\\varnothing', '∅'], ['\\emptyset', '∅'],
	['\\dots', '...'], ['\\cdots', '···'], ['\\quad', ' '], ['\\qquad', '  '],
	['\\,', ' '], ['\\;', ' '], ['\\!', ''],
	['\\|', '‖'],
];

// Always sort longer patterns first to avoid prefix collisions (e.g. \infty before \in)
mathSymbols.sort((a, b) => b[0].length - a[0].length);

export function cleanLatexText(text: string): string {
	if (!text || typeof text !== 'string') return text;
	let out = text;

	// Strip \left and \right modifiers
	out = out.replace(/\\(?:left|right)\b/g, '');

	// Frações: \frac{a}{b} -> (a/b)
	out = out.replace(/\\(?:d)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');

	// Substituições de símbolos matemáticos
	for (const [key, val] of mathSymbols) {
		out = out.split(key).join(val);
	}

	// Remove formatações de fontes LaTeX: \text{...}, \mathbf{...}, \mathrm{...}, \mathbb{...}
	out = out.replace(/\\(?:text|mathbf|mathrm|mathit|boldsymbol|mathcal|textbf|textit|mathbb)\{([^{}]+)\}/g, '$1');

	// Sobrescritos e subscritos comuns
	out = out
		.replace(/\^2\b/g, '²')
		.replace(/\^3\b/g, '³')
		.replace(/\^0\b/g, '⁰')
		.replace(/\^1\b/g, '¹')
		.replace(/\^n\b/g, 'ⁿ')
		.replace(/_0\b/g, '₀')
		.replace(/_1\b/g, '₁')
		.replace(/_2\b/g, '₂')
		.replace(/_3\b/g, '₃')
		.replace(/_i\b/g, 'ᵢ')
		.replace(/_j\b/g, 'ⱼ')
		.replace(/_n\b/g, 'ₙ')
		.replace(/_t\b/g, 'ₜ')
		.replace(/_x\b/g, 'ₓ')
		.replace(/_\+/g, '₊')
		.replace(/_\\infty/g, '_∞')
		.replace(/\^\\infty/g, '^∞')
		.replace(/_∞/g, '_∞')
		.replace(/\^∞/g, '^∞');

	// Subscritos/sobrescritos com chaves: I_{ext} -> I_ext, H^{s} -> H^s
	out = out.replace(/_\{([^{}]+)\}/g, '_$1');
	out = out.replace(/\^\{([^{}]+)\}/g, '^$1');

	// Remove delimitadores norm duplos residuais \| -> ‖
	out = out.replace(/\\\|/g, '‖');

	// Remove chaves soltas residuais de comandos LaTeX como {L^∞} ou {loc}
	out = out.replace(/\{([^{}]+)\}/g, '$1');

	// Remove delimitadores de bloco $$ e embutidos $
	out = out.replace(/\$\$/g, '');
	out = out.replace(/\$([^\$\n]+)\$/g, '$1');
	// Se sobrou algum $ solto, remove
	out = out.replace(/\$/g, '');

	// Qualquer barra invertida solta antes de palavras restantes: \abc -> abc
	out = out.replace(/\\([a-zA-Z]+)/g, '$1');

	return out;
}

export function shouldBufferMath(buffer: string): boolean {
	// 1. If ends with open backslash command: \omega, \int, etc.
	const lastBackslash = buffer.lastIndexOf('\\');
	if (lastBackslash !== -1 && !/[^a-zA-Z]/.test(buffer.slice(lastBackslash + 1))) {
		return true;
	}
	// 2. Check for unclosed $$
	const doubleDollars = (buffer.match(/\$\$/g) || []).length;
	if (doubleDollars % 2 !== 0) {
		return true;
	}
	// 3. Check for unclosed single $ (excluding $$)
	const cleanOfDouble = buffer.replace(/\$\$/g, '');
	const singleDollars = (cleanOfDouble.match(/\$/g) || []).length;
	if (singleDollars % 2 !== 0) {
		return true;
	}
	// 4. Check for open curly brace after backslash e.g. \frac{a}{b} or \mathbb{R}
	const openBraces = (buffer.match(/\{/g) || []).length;
	const closeBraces = (buffer.match(/\}/g) || []).length;
	if (openBraces > closeBraces) {
		return true;
	}
	return false;
}
