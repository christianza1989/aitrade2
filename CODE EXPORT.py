import os

def export_project_code(output_filename="project_code_export.txt"):
    """
    Exports all relevant project code files into a single text file,
    excluding Next.js specific files and other non-code assets.
    """
    root_dir = os.getcwd()
    output_filepath = os.path.join(root_dir, output_filename)

    # Directories and files to exclude
    exclude_dirs = [
        ".git",
        ".next",
        "node_modules",
        "public",
        "__pycache__",
    ]
    exclude_files = [
        ".gitignore",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "next.config.ts",
        "postcss.config.mjs",
        "eslint.config.mjs",
        "README.md",
        "bot_logs_admin.json",
        "bot-status.json",
        "buy_log_admin.json",
        "buy_log_demo.json",
        "buy_log.json",
        "decision_log_admin.json",
        "decision_log_demo.json",
        "decision_log.json",
        "missed_opportunities_admin.json",
        "missed_opportunities_demo.json",
        "missed_opportunities.json",
        "opportunities.json",
        "portfolio_admin.json",
        "portfolio_demo.json",
        "portfolio.json",
        "trades_log_admin.json",
        "trades_log_demo.json",
        "trades_log.json",
        "users.json",
        "config.json",
        output_filename, # Exclude the output file itself
        "export_project_code.py", # Exclude the script itself
    ]
    
    # File extensions to include (common code files)
    include_extensions = [
        ".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".html", ".json" # Include .json for config/data files that are part of the project structure
    ]

    with open(output_filepath, "w", encoding="utf-8") as outfile:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Exclude directories
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

            for filename in filenames:
                if filename in exclude_files:
                    continue
                
                # Check if file extension is in the include list
                _, ext = os.path.splitext(filename)
                if ext not in include_extensions:
                    continue

                filepath = os.path.join(dirpath, filename)
                relative_filepath = os.path.relpath(filepath, root_dir)

                try:
                    with open(filepath, "r", encoding="utf-8") as infile:
                        content = infile.read()
                        outfile.write(f"--- FILE: {relative_filepath} ---\n")
                        outfile.write(content)
                        outfile.write("\n--- END FILE: {relative_filepath} ---\n\n")
                except Exception as e:
                    print(f"Could not read file {relative_filepath}: {e}")

    print(f"Project code exported to {output_filepath}")

if __name__ == "__main__":
    export_project_code()
