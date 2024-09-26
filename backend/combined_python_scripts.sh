#!/bin/bash

# Define the output file
output_file="combined_python_scripts.txt"

# Clear the output file if it exists
> "$output_file"

# Find all Python files excluding the "env/" directory and iterate over them
find . -type f -name "*.py" ! -path "./env/*" | while read -r file; do
  # Append a label with the file name to the output file
  echo "==== File: $file ====" >> "$output_file"
  
  # Append the content of the Python file to the output file
  cat "$file" >> "$output_file"
  
  # Add a newline for separation
  echo -e "\n" >> "$output_file"
done

echo "All Python files have been combined into $output_file, excluding the 'env/' directory."

