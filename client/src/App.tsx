import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TicTacToe from "@/pages/tic-tac-toe";
import Hangman from "@/pages/hangman";
import MadLibs from "@/pages/mad-libs";
import WouldYouRather from "@/pages/would-you-rather";
import WordSearch from "@/pages/word-search";
import DotsAndBoxes from "@/pages/dots-and-boxes";
import WordScramble from "@/pages/word-scramble";
import Yahtzee from "@/pages/yahtzee";
import DiceRoller from "@/pages/dice-roller";
import Scorecard from "@/pages/scorecard";
import Sudoku from "@/pages/sudoku";
import ConnectFour from "@/pages/connect-four";
import Battleship from "@/pages/battleship";
import ShellGame from "@/pages/shell-game";
import RiddleStories from "@/pages/riddle-stories";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tic-tac-toe" component={TicTacToe} />
      <Route path="/hangman" component={Hangman} />
      <Route path="/mad-libs" component={MadLibs} />
      <Route path="/would-you-rather" component={WouldYouRather} />
      <Route path="/word-search" component={WordSearch} />
      <Route path="/dots-and-boxes" component={DotsAndBoxes} />
      <Route path="/word-scramble" component={WordScramble} />
      <Route path="/yahtzee" component={Yahtzee} />
      <Route path="/dice-roller" component={DiceRoller} />
      <Route path="/scorecard" component={Scorecard} />
      <Route path="/sudoku" component={Sudoku} />
      <Route path="/connect-four" component={ConnectFour} />
      <Route path="/battleship" component={Battleship} />
      <Route path="/shell-game" component={ShellGame} />
      <Route path="/riddle-stories" component={RiddleStories} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
