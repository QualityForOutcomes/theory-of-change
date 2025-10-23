import { Validators } from '../../validators';

describe('Validators - Project', () => {
  describe('createProject', () => {
    it('errors when projectTitle is missing', () => {
      const errors = Validators.createProject({});
      expect(errors).toContain('projectTitle is required');
    });

    it('passes when projectTitle is provided', () => {
      const errors = Validators.createProject({ projectTitle: 'My Project' });
      expect(errors).toEqual([]);
    });
  });

  describe('updateProject', () => {
    it('errors when projectId is missing or not a string', () => {
      expect(Validators.updateProject({ projectTitle: 't' })).toContain('projectId is required and must be a string');
      expect(Validators.updateProject({ projectId: 123, projectTitle: 't' })).toContain('projectId is required and must be a string');
    });

    it('errors when projectTitle is missing or not a string', () => {
      expect(Validators.updateProject({ projectId: 'p1' })).toContain('projectTitle is required and must be a string');
      expect(Validators.updateProject({ projectId: 'p1', projectTitle: 123 as any })).toContain('projectTitle is required and must be a string');
    });

    it('passes when both projectId and projectTitle are valid strings', () => {
      const errors = Validators.updateProject({ projectId: 'p1', projectTitle: 'New Title' });
      expect(errors).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('errors when projectId is missing or not a string', () => {
      expect(Validators.deleteProject({})).toContain('projectId is required and must be a string');
      expect(Validators.deleteProject({ projectId: 42 })).toContain('projectId is required and must be a string');
    });

    it('passes when projectId is a valid string', () => {
      const errors = Validators.deleteProject({ projectId: 'p1' });
      expect(errors).toEqual([]);
    });
  });
});

describe('Validators - Auth', () => {
  describe('userRegistration', () => {
    it('errors when email is invalid', () => {
      const errors = Validators.userRegistration({ email: 'bad', password: 'StrongPass1' });
      expect(errors).toContain('Valid email is required');
    });

    it('errors when email is missing', () => {
      const errors = Validators.userRegistration({ password: 'StrongPass1' });
      expect(errors).toContain('Valid email is required');
    });

    it('errors when password is missing', () => {
      const errors = Validators.userRegistration({ email: 'user@example.com' });
      expect(errors).toContain('Password is required');
    });

    it('errors when password is weak (too short)', () => {
      const errors = Validators.userRegistration({ email: 'user@example.com', password: 'short' });
      expect(errors).toContain('Password must be at least 8 characters long');
    });

    it('passes when email and strong password are provided', () => {
      const errors = Validators.userRegistration({ email: 'user@example.com', password: 'StrongPass1' });
      expect(errors).toEqual([]);
    });
  });

  describe('userLogin', () => {
    it('errors when email is invalid', () => {
      const errors = Validators.userLogin({ email: 'not-an-email', password: 'any' });
      expect(errors).toContain('Valid email is required');
    });

    it('errors when email is missing', () => {
      const errors = Validators.userLogin({ password: 'any' });
      expect(errors).toContain('Valid email is required');
    });

    it('errors when password is missing', () => {
      const errors = Validators.userLogin({ email: 'user@example.com' });
      expect(errors).toContain('Password is required');
    });

    it('passes with valid email and any password string', () => {
      const errors = Validators.userLogin({ email: 'user@example.com', password: 'any' });
      expect(errors).toEqual([]);
    });
  });
});

describe('Validators - User Account', () => {
  describe('userUpdate', () => {
    it('errors when username is provided but invalid', () => {
      const errors = Validators.userUpdate({ username: 'bad name' });
      expect(errors).toContain('Username must be 3-30 characters and contain only letters, numbers, and underscores');
    });

    it('passes when username is valid', () => {
      const errors = Validators.userUpdate({ username: 'valid_user_123' });
      expect(errors).toEqual([]);
    });

    it('passes when username is empty string (treated as not provided)', () => {
      const errors = Validators.userUpdate({ username: '' });
      expect(errors).toEqual([]);
    });

    it('passes when username is not provided', () => {
      const errors = Validators.userUpdate({});
      expect(errors).toEqual([]);
    });
  });

  describe('userDelete', () => {
    it('errors when confirmDelete is not true', () => {
      const errors = Validators.userDelete({ confirmDelete: false });
      expect(errors).toContain('Account deletion must be confirmed by setting confirmDelete to true');
    });

    it('passes when confirmDelete is true', () => {
      const errors = Validators.userDelete({ confirmDelete: true });
      expect(errors).toEqual([]);
    });
  });
});

describe('Validators - Password Reset', () => {
  it('errors when request body is missing', () => {
    const errors = Validators.passwordReset(undefined as any);
    expect(errors).toContain('Request body is required');
  });

  it('errors when email is missing or invalid', () => {
    expect(Validators.passwordReset({ action: 'request-reset' })).toContain('Email is required');
    expect(Validators.passwordReset({ email: 'bad', action: 'request-reset' })).toContain('Valid email is required');
  });

  it('errors when action is missing or invalid', () => {
    expect(Validators.passwordReset({ email: 'user@example.com' })).toContain('Action is required');
    expect(Validators.passwordReset({ email: 'user@example.com', action: 'unknown' })).toContain('Invalid action. Must be "request-reset" or "verify-token"');
  });

  it('errors verify-token flow specific fields', () => {
    const base = { email: 'user@example.com', action: 'verify-token' };
    expect(Validators.passwordReset({ ...base })).toContain('Token is required for verify-token action');
    expect(Validators.passwordReset({ ...base, token: 'tok' })).toContain('New password is required for verify-token action');
    expect(Validators.passwordReset({ ...base, token: 'tok', newPassword: 'short' })).toContain('Password must be at least 8 characters long');
  });

  it('passes verify-token with strong password and token', () => {
    const errors = Validators.passwordReset({ email: 'user@example.com', action: 'verify-token', token: 'tok123', newPassword: 'StrongPass1' });
    expect(errors).toEqual([]);
  });

  it('passes request-reset with valid email', () => {
    const errors = Validators.passwordReset({ email: 'user@example.com', action: 'request-reset' });
    expect(errors).toEqual([]);
  });
});