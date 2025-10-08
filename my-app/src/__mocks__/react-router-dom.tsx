import React from 'react';

export const mockNavigate = jest.fn();
export const mockUseParams = jest.fn(() => ({ projectId: "test-project-123" }));

export const useNavigate = () => mockNavigate;
export const useParams = () => mockUseParams();

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="browser-router">{children}</div>
);

export const Link = ({ children, to, ...props }: any) => (
  <a href={to} {...props}>{children}</a>
);

export const Route = ({ children }: any) => <>{children}</>;
export const Routes = ({ children }: any) => <>{children}</>;