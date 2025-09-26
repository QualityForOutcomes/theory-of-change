import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

type Props = {
  children: ReactElement; 
};

export default function PrivateRoute({ children }: Props) {
  const { user } = useAuth(); 
  return user ? children : <Navigate to="/login" replace />;
}
