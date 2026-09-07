import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";

import Home from "./pages/Home";
import MyJourney from "./pages/MyJourney";
import Community from "./pages/Community";
import Resources from "./pages/Resources";
import Archive from "./pages/Archive";
import Account from "./pages/Account";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/journey" element={<MyJourney />} />
          <Route path="/community" element={<Community />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
