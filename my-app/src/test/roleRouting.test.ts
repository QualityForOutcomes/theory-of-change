import { determineUserRole, handleRoleBasedRedirect, User } from "../utils/roleRouting";

describe("determineUserRole", () => {
  test("returns admin when role is 'admin'", () => {
    const user: User = { role: "admin" };
    expect(determineUserRole(user)).toBe("admin");
  });

  test("returns admin when userRole is 'admin'", () => {
    const user: User = { userRole: "admin" };
    expect(determineUserRole(user)).toBe("admin");
  });

  test("returns admin when user_role is 'admin'", () => {
    const user: User = { user_role: "admin" };
    expect(determineUserRole(user)).toBe("admin");
  });

  test("normalizes casing and defaults to 'user'", () => {
    expect(determineUserRole({ role: "Admin" })).toBe("admin");
    expect(determineUserRole({ role: "USER" })).toBe("user");
    expect(determineUserRole({})).toBe("user");
  });
});

describe("handleRoleBasedRedirect", () => {
  const OLD_ENV = process.env;
  let originalLocation: Location;
  let mockAssign: jest.Mock;

  beforeEach(() => {
    // Clone env so per-test changes don't leak
    process.env = { ...OLD_ENV };
    localStorage.clear();
    originalLocation = window.location;
    mockAssign = jest.fn();
    // Override readonly Location with a minimal stub for assign
    delete (window as any).location;
    (window as any).location = { assign: mockAssign } as any;
  });

  afterEach(() => {
    // Restore original Location
    (window as any).location = originalLocation;
  });

  test("navigates to '/' for regular user", () => {
    const navigate = jest.fn();
    handleRoleBasedRedirect({ role: "user" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    expect(mockAssign).not.toHaveBeenCalled();
  });

  test("redirects admin to admin URL with token", () => {
    process.env.REACT_APP_ADMIN_URL = "http://localhost:5173/admin/terms";
    localStorage.setItem("token", "abc123");
    const navigate = jest.fn();

    handleRoleBasedRedirect({ role: "admin" }, navigate);

    expect(mockAssign).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith("http://localhost:5173/admin/terms?token=abc123");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("redirects admin to admin URL without token when missing", () => {
    process.env.REACT_APP_ADMIN_URL = "http://localhost:5173/admin/terms";
    const navigate = jest.fn();

    handleRoleBasedRedirect({ role: "admin" }, navigate);

    expect(mockAssign).toHaveBeenCalledWith("http://localhost:5173/admin/terms");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("throws when REACT_APP_ADMIN_URL is missing for admin", () => {
    delete process.env.REACT_APP_ADMIN_URL;
    const navigate = jest.fn();

    expect(() => handleRoleBasedRedirect({ role: "admin" }, navigate)).toThrow(
      "REACT_APP_ADMIN_URL is not defined"
    );
    expect(mockAssign).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});