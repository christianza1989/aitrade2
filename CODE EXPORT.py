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
        ".vscode",
        "data",  # Database data directory
    ]
    exclude_files = [
        ".gitignore",
        "package-lock.json",  # Keep package.json for dependencies info
        "tsconfig.tsbuildinfo",  # Build info file
        "next-env.d.ts",  # Auto-generated
        "README.md",  # Documentation
        # Log files (keep some for debugging if needed)
        "bot_logs_admin.json",
        "bot-status.json",
        "buy_log_admin.json",
        "buy_log_demo.json",
        "decision_log_admin.json",
        "decision_log_demo.json",
        "missed_opportunities_admin.json",
        "missed_opportunities_demo.json",
        "opportunities.json",
        "portfolio_admin.json",
        "portfolio_demo.json",
        "trades_log_admin.json",
        "trades_log_demo.json",
        "users.json",
        output_filename, # Exclude the output file itself
        "CODE EXPORT.py", # Exclude the script itself
    ]
    
    # File extensions to include (common code files)
    include_extensions = [
        ".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".html", ".json", # Include .json for config/data files
        ".yml", ".yaml", # Docker Compose files
        ".dockerfile", ".Dockerfile", # Dockerfile
        ".dockerignore", # Docker ignore file
        ".env", ".env.example", ".env.local", # Environment files
        ".md", # Documentation files
        ".prisma", # Prisma schema
        ".toml", ".lock", # Dependency files
        ".config.js", ".config.ts", # Config files
    ]

    # Specific important files to always include (even if extension not in include_extensions)
    important_files = [
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.override.yml",
        ".dockerignore",
        ".env",
        ".env.example",
        ".env.local",
        "package.json",
        "tsconfig.json",
        "tsconfig.worker.json",
        "prisma/schema.prisma",
        "jest.config.ts",
        "tailwind.config.ts",
        "next.config.ts",
        "postcss.config.mjs",
        "eslint.config.mjs",
    ]

    with open(output_filepath, "w", encoding="utf-8") as outfile:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Exclude directories
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                relative_filepath = os.path.relpath(filepath, root_dir)

                # Always include important files
                if filename in important_files:
                    pass  # Include this file
                elif filename in exclude_files:
                    continue  # Skip excluded files
                else:
                    # Check if file extension is in the include list
                    _, ext = os.path.splitext(filename)
                    if ext not in include_extensions:
                        continue

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
