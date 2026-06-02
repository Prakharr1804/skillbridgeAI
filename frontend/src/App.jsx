import { RouterProvider } from "react-router";
import { router } from "./app.routes";
import { ThemeProvider } from "./theme.context";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <ThemeToggle />
    </ThemeProvider>
  );
}

export default App;