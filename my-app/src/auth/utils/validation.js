export function validateEmailDetailed(email) {
    if (!email) return "Email is required.";
  
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) return "Email must contain exactly one @ symbol.";
  
    const [local, domain] = email.split("@");
  
    // Local part rules
    if (local.length === 0) return "Text before @ is empty.";
    if (local.length > 64) return "Text before @ must be 64 characters or fewer.";
    if (local.startsWith(".") || local.endsWith(".")) return "Text before @ cannot start or end with a dot.";
    if (local.includes("..")) return "Text before @ cannot contain consecutive dots.";
    if (!/^[A-Za-z0-9._+-]+$/.test(local)) {
      return "Text before @ has invalid characters.";
    }
  
    // Domain rules
    if (!domain) return "Domain after @ is missing.";
    if (!domain.includes(".")) return "Domain must contain a dot (e.g., example.com).";
    const labels = domain.split(".");
    for (const label of labels) {
      if (label.length === 0) return "Domain has an empty label.";
      if (label.length > 63) return "A domain label is longer than 63 characters.";
      if (!/^[A-Za-z0-9-]+$/.test(label)) return "Domain labels can only use letters, digits, and hyphens.";
      if (label.startsWith("-") || label.endsWith("-")) return "Domain labels cannot start or end with a hyphen.";
    }
  
    const tld = labels[labels.length - 1];
    if (tld.length < 2) return "Top-level domain must be at least 2 characters.";
  
    if (email.length > 254) return "Email address is too long (max 254 characters).";
  
    return ""; // valid
  }
  

export function validatePassword(password) {
    if (!password) return "Password is required.";
  
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }
  
    if (password.length > 64) {
      return "Password must be at most 64 characters.";
    }
  
    // at least one uppercase, lowercase, digit, special char
    if (!/[A-Z]/.test(password)) {
      return "Password must have at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must have at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must have at least one digit.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must have at least one special character.";
    }
  
    return ""; 
  }
  