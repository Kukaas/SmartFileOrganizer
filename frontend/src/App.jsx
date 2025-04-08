import { toast } from "sonner";
import "./App.css";
import { Button } from "./components/ui/button";

function App() {
  const handleClick = () => {
    toast.success(
      "This is a success message. You can use this to show success notifications."
    );
  };
  return (
    <div className="justify-center items-center flex h-screen bg-gray-100">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">Welcome Tato</h1>
        <Button onClick={handleClick}>Click Me</Button>
      </div>
    </div>
  );
}

export default App;
