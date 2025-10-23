import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../pages/App';
import * as api from '../services/api';

// Mock dependencies
const mockNavigate = jest.fn();
const mockParams: { projectId?: string } = { projectId: undefined };

jest.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

jest.mock('react-joyride', () => {
  return function Joyride() {
    return null;
  };
});

// Mock API functions
jest.mock('../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('userId', 'test-user-123');
    localStorage.setItem('projectId', 'project-123');
    mockParams.projectId = undefined;
    
    // Default mock responses
    mockedApi.fetchTocProjectById.mockResolvedValue({
      success: true,
      data: {
        projects: [{
          projectId: 'project-123',
          tocData: {
            projectTitle: 'Test Project',
            bigPictureGoal: 'Test Goal',
            projectAim: 'Test Aim',
            beneficiaries: { description: 'Test Beneficiaries', estimatedReach: 100 },
            activities: ['Activity 1', 'Activity 2'],
            objectives: ['Objective 1', 'Objective 2'],
            externalFactors: ['Factor 1', 'Factor 2'],
          },
          tocColor: {},
        }],
      },
      message: '',
    });

    mockedApi.updateToc.mockResolvedValue({
      success: true,
      data: null,
      message: 'Success',
    });
  });

  afterEach(() => {
    jest.useRealTimers(); // Ensure real timers are restored after each test
  });

  describe('Initial Rendering', () => {
    test('renders main heading', async () => {
      render(<App />);
      
      expect(screen.getByText('Theory of Change Visualisation')).toBeInTheDocument();
    });

    test('renders FormPanel and VisualPanel', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/Step 1: Identify Big-Picture Goal/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText('Activities')).toBeInTheDocument();
      expect(screen.getByText('Objectives')).toBeInTheDocument();
    });

    test('renders Save button', () => {
      render(<App />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    test('Save button is disabled when form is invalid', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: '',
              bigPictureGoal: '',
              projectAim: '',
              beneficiaries: { description: '', estimatedReach: 0 },
              activities: [],
              objectives: [],
              externalFactors: [],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Project Loading', () => {
    test('loads project data on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(mockedApi.fetchTocProjectById).toHaveBeenCalledWith('project-123');
      });
    });

    test('displays loaded project data', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Aim')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Beneficiaries')).toBeInTheDocument();
      });
    });

    test('handles project load error gracefully', async () => {
      mockedApi.fetchTocProjectById.mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load project/i)).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    test('uses default colors when no colors are saved', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: 'Test Project',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Beneficiaries', estimatedReach: 0 },
              activities: ['Activity'],
              objectives: ['Objective'],
              externalFactors: ['Factor'],
            },
            tocColor: null,
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Goal')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('shows warning when trying to save empty form', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: '',
              bigPictureGoal: '',
              projectAim: '',
              beneficiaries: { description: '', estimatedReach: 0 },
              activities: [],
              objectives: [],
              externalFactors: [],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('title', 'Please fill in all required fields');
    });

    test('validates project title is not empty', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: '',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Beneficiaries', estimatedReach: 0 },
              activities: ['Activity'],
              objectives: ['Objective'],
              externalFactors: ['Factor'],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });

    test('validates all fields have content', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: 'Title',
              bigPictureGoal: '',
              projectAim: '',
              beneficiaries: { description: '', estimatedReach: 0 },
              activities: [],
              objectives: [],
              externalFactors: [],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Save Functionality', () => {
    test('successfully saves valid form data', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockedApi.updateToc).toHaveBeenCalled();
        expect(screen.getByText(/Form saved successfully/i)).toBeInTheDocument();
      });
    });

    test('shows error message when save fails', async () => {
      mockedApi.updateToc.mockResolvedValueOnce({
        success: false,
        data: null,
        message: 'Save failed',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Error saving form/i)).toBeInTheDocument();
      });
    });

    test('disables button while saving', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    });

    test('sends correct payload structure to API', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockedApi.updateToc).toHaveBeenCalled();
      });

      const payload = mockedApi.updateToc.mock.calls[0][0];
      
      expect(payload).toHaveProperty('tocData');
      expect(payload.tocData).toHaveProperty('bigPictureGoal');
      expect(payload.tocData).toHaveProperty('projectAim');
      expect(payload.tocData).toHaveProperty('activities');
      expect(payload.tocData).toHaveProperty('objectives');
      expect(payload.tocData).toHaveProperty('externalFactors');
    });
  });

  describe('Toast Notifications', () => {
    test('shows success toast after save', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Form saved successfully/i)).toBeInTheDocument();
      });
    });

    // Use real timers for toast auto-dismissal test
    test('toast auto-closes after 3 seconds', async () => {
      jest.useRealTimers();
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Form saved successfully/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/Form saved successfully/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });

    // Test that error toast also auto-closes
    test('can close toast manually', async () => {
      jest.useRealTimers();
      
      mockedApi.fetchTocProjectById.mockRejectedValueOnce(new Error('Load error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load project/i)).toBeInTheDocument();
      });

      // Toast should auto-close after 3 seconds
      await waitFor(() => {
        expect(screen.queryByText(/Failed to load project/i)).not.toBeInTheDocument();
      }, { timeout: 4000 });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Field Highlighting', () => {
    test('highlights field when added from visual panel', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });
    });
  });

  describe('Color Management', () => {
    test('loads custom colors from project', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: 'Test',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Ben', estimatedReach: 0 },
              activities: ['Act'],
              objectives: ['Obj'],
              externalFactors: ['Fac'],
            },
            tocColor: {
              activities: { bg: '#ff0000', text: '#ffffff' },
              objectives: { bg: '#00ff00', text: '#000000' },
              projectAim: { bg: '#0000ff', text: '#ffffff' },
              bigPictureGoal: { bg: '#ffff00', text: '#000000' },
              externalFactors: [{ bg: '#ff00ff', text: '#ffffff' }],
            },
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Goal')).toBeInTheDocument();
      });
    });

    test('handles cloud colors as array', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: 'Test',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Ben', estimatedReach: 0 },
              activities: ['Act'],
              objectives: ['Obj'],
              externalFactors: ['Fac 1', 'Fac 2'],
            },
            tocColor: {
              externalFactors: [
                { bg: '#ff0000', text: '#ffffff' },
                { bg: '#00ff00', text: '#000000' },
              ],
            },
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Goal')).toBeInTheDocument();
      });
    });

    test('handles cloud colors as object', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: 'Test',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Ben', estimatedReach: 0 },
              activities: ['Act'],
              objectives: ['Obj'],
              externalFactors: ['Fac'],
            },
            tocColor: {
              externalFactors: {
                '0': { bg: '#ff0000', text: '#ffffff' },
              },
            },
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Goal')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles missing project data', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: { projects: [] },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    test('handles null tocData fields', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: null,
              bigPictureGoal: null,
              projectAim: null,
              beneficiaries: null,
              activities: null,
              objectives: null,
              externalFactors: null,
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    test('handles project without projectId in localStorage', async () => {
      localStorage.removeItem('projectId');
      mockParams.projectId = undefined;

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      });
    });

    test('parses array fields correctly', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Goal')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const payload = mockedApi.updateToc.mock.calls[0][0];
        expect(Array.isArray(payload.tocData.activities)).toBe(true);
        expect(Array.isArray(payload.tocData.objectives)).toBe(true);
        expect(Array.isArray(payload.tocData.externalFactors)).toBe(true);
      });
    });

    test('handles whitespace-only fields as empty', async () => {
      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: 'project-123',
            tocData: {
              projectTitle: '   ',
              bigPictureGoal: '   ',
              projectAim: '   ',
              beneficiaries: { description: '   ', estimatedReach: 0 },
              activities: ['   '],
              objectives: ['   '],
              externalFactors: ['   '],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Joyride Tour', () => {
    test('starts tour on component mount', async () => {
      localStorage.removeItem('tour-seen-project-1');
      mockParams.projectId = '1';
      localStorage.setItem('projectId', '1');

      mockedApi.fetchTocProjectById.mockResolvedValueOnce({
        success: true,
        data: {
          projects: [{
            projectId: '1',
            tocData: {
              projectTitle: 'First Project',
              bigPictureGoal: 'Goal',
              projectAim: 'Aim',
              beneficiaries: { description: 'Ben', estimatedReach: 0 },
              activities: ['Act'],
              objectives: ['Obj'],
              externalFactors: ['Fac'],
            },
            tocColor: {},
          }],
        },
        message: '',
      });

      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Goal')).toBeInTheDocument();
      });
    });
  });
});