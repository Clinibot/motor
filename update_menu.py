import os
import re

files = [
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/agents/page.tsx",
    "src/app/dashboard/settings/page.tsx",
    "src/app/dashboard/numbers/page.tsx",
    "src/app/dashboard/templates/page.tsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Check if target is in the map
    if "label: 'Biblioteca de plantillas'" in content:
        # Remove it from the map
        content = re.sub(
            r"\s*\{\s*label:\s*'Biblioteca de plantillas',\s*href:\s*'/dashboard/templates',\s*icon:\s*'[^']+',\s*active:\s*(true|false)\s*\},",
            "",
            content
        )
        
        # Determine if we are on the templates page
        is_active = "true" if "templates/page.tsx" in file_path else "false"
        active_class_logic = " active\"" if is_active == "true" else "\""
        
        new_link = f"""<Link href="/dashboard/templates" className="nav-item admin-item{active_class_logic}>
                                    <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" clipRule="evenodd" />
                                    </svg>
                                    Biblioteca de plantillas
                                </Link>
                                <Link"""
                                
        content = content.replace("<Link href=\"/admin\"", new_link)
        
        # Optional: Add active state CSS for admin-item if it doesn't exist
        css_addition = ".nav-item.admin-item.active{background:#ede9fe;color:#6d28d9;border-right:3px solid #7c3aed}"
        if "{color:#7c3aed}" in content and css_addition not in content:
            content = content.replace(".nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}", 
            ".nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}\n                " + css_addition)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        print(f"Updated {file_path}")
    else:
        print(f"Already updated or not found in {file_path}")

