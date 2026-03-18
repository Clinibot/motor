const fs = require('fs');

const files = [
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/agents/page.tsx",
    "src/app/dashboard/settings/page.tsx",
    "src/app/dashboard/numbers/page.tsx",
    "src/app/dashboard/templates/page.tsx"
];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        
        const startStr = "{ label: 'Biblioteca de plantillas'";
        let startIdx = content.indexOf(startStr);
        if (startIdx !== -1) {
            while(startIdx > 0 && content[startIdx-1] !== '\n') startIdx--;
            let endIdx = content.indexOf('\n', startIdx + 1);
            if (endIdx === -1) endIdx = content.length;
            content = content.slice(0, startIdx) + content.slice(endIdx);
            console.log(`Removed old menu item from ${file}`);
        }
        
        const isActive = file.includes('templates') ? ' active' : '';
        const searchLink = '<Link href="/admin" className="nav-item admin-item">';
        
        if (content.indexOf('Biblioteca de plantillas') === -1) {
            const newLink = `
                                <Link href="/dashboard/templates" className="nav-item admin-item${isActive}">
                                    <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" clipRule="evenodd" />
                                    </svg>
                                    Biblioteca de plantillas
                                </Link>
                                ${searchLink}`;
            content = content.replace(searchLink, newLink);
            console.log(`Added admin menu item to ${file}`);
        }
        
        if (!content.includes('.nav-item.admin-item.active')) {
            content = content.replace(
                '.nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}',
                '.nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}\n                .nav-item.admin-item.active{background:#ede9fe;color:#6d28d9;border-right:3px solid #7c3aed}'
            );
        }
        
        fs.writeFileSync(file, content, 'utf8');
    } catch(e) {
        console.error("Error on file " + file + ":", e);
    }
});
