const mockPDF = {
  addImage: jest.fn(),
  save: jest.fn(),
};

const jsPDF = jest.fn(() => mockPDF);

export default jsPDF;