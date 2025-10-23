import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TermsManagement from '../features/admin/TermsManagement.jsx';

// Mock the RichTextEditor to a simple textarea
vi.mock('../components/RichTextEditor', () => ({
  default: ({ value, onChange }) => (
    <textarea id="terms-content" value={value} onChange={(e) => onChange(e.target.value)} />
  )
}));

// Partially mock termsApi: keep validation, stub fetch/update
vi.mock('../features/admin/api/termsApi.js', async () => {
  const actual = await vi.importActual('../features/admin/api/termsApi.js');
  return {
    ...actual,
    fetchTerms: vi.fn(),
    updateTerms: vi.fn(),
  };
});

import { fetchTerms, updateTerms } from '../features/admin/api/termsApi.js';

describe('TermsManagement', () => {
  beforeEach(() => {
    fetchTerms.mockResolvedValue({
      content: 'Initial terms content ' + 'x'.repeat(60),
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
    });
    updateTerms.mockResolvedValue({
      content: 'Initial terms content ' + 'x'.repeat(60),
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('loads terms and allows saving valid updates', async () => {
    render(<TermsManagement />);

    // Loading state
    expect(screen.getByText(/Loading terms and conditions/i)).toBeInTheDocument();

    // Editor appears after load
    await screen.findByLabelText(/Terms and Conditions Content/i);

    const editor = screen.getByLabelText(/Terms and Conditions Content/i);
    fireEvent.change(editor, { target: { value: 'Updated terms content ' + 'y'.repeat(60) } });

    const saveBtn = screen.getByText('Save Changes');
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => expect(updateTerms).toHaveBeenCalled());
    expect(screen.getByText('Terms and conditions updated successfully!')).toBeInTheDocument();
  });

  test('blocks save when content is too short', async () => {
    render(<TermsManagement />);

    await screen.findByLabelText(/Terms and Conditions Content/i);
    const editor = screen.getByLabelText(/Terms and Conditions Content/i);

    fireEvent.change(editor, { target: { value: 'too short' } });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Cannot save: Terms content must be at least 50 characters\./)).toBeInTheDocument();
  });

  test('shows error when fetching terms fails', async () => {
    fetchTerms.mockRejectedValueOnce(new Error('network'));

    render(<TermsManagement />);

    await waitFor(() => {
      expect(screen.getByText('Error loading terms and conditions')).toBeInTheDocument();
    });
  });

  test('shows error when saving terms fails', async () => {
    render(<TermsManagement />);

    await screen.findByLabelText(/Terms and Conditions Content/i);
    const editor = screen.getByLabelText(/Terms and Conditions Content/i);

    updateTerms.mockRejectedValueOnce(new Error('save failed'));

    fireEvent.change(editor, { target: { value: 'Valid updated ' + 'z'.repeat(60) } });
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Error saving terms and conditions')).toBeInTheDocument();
    });
  });
});