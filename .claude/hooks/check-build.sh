#!/bin/bash
# TaskCompleted hook: verify the project builds before marking a task done.
# Exit 0 = allow completion, Exit 2 = block completion (stderr shown to agent).

# Only run the check if package.json exists (project has been scaffolded)
if [ ! -f "package.json" ]; then
  exit 0
fi

# Only run if node_modules exists (deps installed)
if [ ! -d "node_modules" ]; then
  exit 0
fi

# Run TypeScript type checking (faster than full build)
if command -v bunx &> /dev/null; then
  OUTPUT=$(bunx tsc --noEmit 2>&1)
else
  OUTPUT=$(npx tsc --noEmit 2>&1)
fi

if [ $? -ne 0 ]; then
  echo "TypeScript errors found. Fix them before completing this task:" >&2
  echo "$OUTPUT" >&2
  exit 2
fi

exit 0
