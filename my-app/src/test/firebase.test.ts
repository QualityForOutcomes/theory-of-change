// src/test/firebase.test.tsx
/**
 * Tests for src/lib/firebase.ts
 * - Uses jest.isolateModules (sync) + require() to load the module after mocks.
 * - Works on Jest versions without isolateModulesAsync.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// --- Strict mocks for Firebase SDK (use a class so instanceof works) ---
class MockGoogleAuthProvider {}

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  GoogleAuthProvider: MockGoogleAuthProvider,
}));

// Pull the mocked functions so we can set return values & assert calls
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

describe("firebase config (src/lib/firebase.ts)", () => {
  const mockApp = { name: "mockApp" };

  beforeEach(() => {
    // Fresh module graph each test so the module under test re-executes
    jest.resetModules();
    (initializeApp as jest.Mock).mockReset().mockReturnValue(mockApp);
    (getAuth as jest.Mock).mockReset().mockReturnValue("mockAuth");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("initializes Firebase with the expected config", () => {
    jest.isolateModules(() => {
      // Import AFTER mocks are set so module init runs against mocks
      require("../lib/firebase");

      expect(initializeApp).toHaveBeenCalledTimes(1);
      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: "AIzaSyAJRVA9Tssggj8cOeePo9kTu4StrOfgsFs",
        authDomain: "p000315se.firebaseapp.com",
        projectId: "p000315se",
        storageBucket: "p000315se.firebasestorage.app",
        messagingSenderId: "113828877811",
        appId: "1:113828877811:web:049557794f2e9718bd6e86",
      });
    });
  });

  it("creates auth from the initialized app and exports it", () => {
    jest.isolateModules(() => {
      const mod = require("../lib/firebase"); // { auth, googleProvider }

      expect(getAuth).toHaveBeenCalledTimes(1);
      expect(getAuth).toHaveBeenCalledWith(mockApp);
      expect(mod.auth).toBe("mockAuth");
    });
  });

  it("exports a GoogleAuthProvider instance", () => {
    jest.isolateModules(() => {
      const mod = require("../lib/firebase");

      // Our mock returns a class, so instanceof works
      expect(mod.googleProvider).toBeInstanceOf(
        GoogleAuthProvider as unknown as Function
      );
    });
  });
});
