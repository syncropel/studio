// This file defines the shape of the command objects for the frontend.

// This interface now represents the properties we check for in the UI.
export interface Executable {
  command?: string; // For BuiltinCommands like 'connections'
  subcommand?: string; // For management commands like 'connection list'
}

// Command is an alias for Executable for simplicity.
export type Command = Executable;
