#!/bin/bash

# Define the output file
output_file="combined_scripts_2.txt"

# Clear the output file if it exists
> "$output_file"

# Function to process files
process_files() {
    local file_type=$1
    local search_dir=$2
    
    find "$search_dir" -type f -name "$file_type" \
        ! -path "*/node_modules/*" \
        ! -path "*/env/*" \
        ! -path "*/.git/*" \
        ! -name ".gitignore" \
        ! -path "*/.*/*" \
        ! -name "*.env" \
        ! -name "*.config" \
        ! -path "*/backend/api/migrations_backup/*" \
        ! -path "*/backend/api/migrations/*" \
        | while read -r file; do
        # Print each file being processed (for debugging)
        echo "Processing: $file"

        # Append a label with the file name to the output file
        echo "==== File: $file ====" >> "$output_file"

        # Append the content of the file to the output file
        cat "$file" >> "$output_file"

        # Add a newline for separation
        echo -e "\n" >> "$output_file"
    done
}

# Process Python files in both frontend and backend directories
process_files "*.py" "./frontend"
process_files "*.py" "./backend"

# Process JSX, JS, and CSS files in the frontend directory
process_files "*.jsx" "./frontend"
process_files "*.js" "./frontend"
process_files "*.css" "./frontend"

echo "All specified files have been combined into $output_file."
