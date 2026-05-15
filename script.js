
{ // Block scope prevents "Identifier already declared" errors
    // const apiKey = ""; 
    // 1. Remove the hardcoded key
let apiKey = localStorage.getItem('gemini_api_key'); 

async function runAudit() {
    // 2. Check if the key exists, if not, ask for it
    if (!apiKey) {
        apiKey = prompt("Please enter your Google Gemini API Key to run the audit (it is saved locally in your browser):");
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
        } else {
            alert("API Key is required to run the audit.");
            return;
        }
    }
    
    // ... rest of your runAudit function
     const q = document.getElementById('searchInput').value.trim();
        if (!q) return;

        document.getElementById('idleState').classList.add('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        const load = document.getElementById('loadingState');
        const statusText = document.getElementById('auditStatus');
        if (load) load.classList.remove('hidden');

        if(statusText) statusText.textContent = "Connecting to Gemini 2.0 Flash...";
        
        try {
            globalData = await fetchAI(q);
            render(globalData);
        } catch (e) {
            console.error("Audit Execution Failure:", e);
            alert("Error: " + e.message);
            if (load) load.classList.add('hidden');
            document.getElementById('idleState').classList.remove('hidden');
        }
}

    let pieInstance, lineInstance, globalData;

    // Attach to window so HTML onclick can find it
    // window.runAudit = async function() {
    //     const q = document.getElementById('searchInput').value.trim();
    //     if (!q) return;

    //     document.getElementById('idleState').classList.add('hidden');
    //     document.getElementById('dashboard').classList.add('hidden');
    //     const load = document.getElementById('loadingState');
    //     const statusText = document.getElementById('auditStatus');
    //     if (load) load.classList.remove('hidden');

    //     if(statusText) statusText.textContent = "Connecting to Gemini 2.0 Flash...";
        
    //     try {
    //         globalData = await fetchAI(q);
    //         render(globalData);
    //     } catch (e) {
    //         console.error("Audit Execution Failure:", e);
    //         alert("Error: " + e.message);
    //         if (load) load.classList.add('hidden');
    //         document.getElementById('idleState').classList.remove('hidden');
    //     }
    // };

    async function fetchAI(company) {
        const sys = `High-Audit Command Analysis: Research ${company} in CANADA. Provide punchy Command Summaries. Return ONLY clean JSON.`;
        // const body = `Return a labor dossier for ${company} CANADA in JSON format. Use the schema provided in previous instructions.`;
        const body = `Return a labor dossier for ${company} CANADA. 
You MUST use this exact JSON schema:
{
    "name": "Company Name",
    "industry": "Sector",
    "summary": ["Point 1", "Point 2"],
    "confidence": 95,
    "restrictionText": "Text about agency limits",
    "restrictionUrl": "URL",
    "commandTakeaways": {
        "analytics": "1-sentence summary",
        "strike": "1-sentence summary",
        "news": "1-sentence summary",
        "ledger": "1-sentence summary"
    },
    "stats": { 
        "total": 1000, 
        "union": 800, 
        "agency": 200, 
        "units": 5, 
        "juris": "Federal" 
    },
    "growth": { 
        "years": ["2022", "2023", "2024", "2025", "2026"], 
        "values": [100, 110, 120, 130, 140] 
    },
    "negs": {
        "ongoing": [{"unit": "Name", "status": "Status"}],
        "upcoming": [{"date": "Date", "impact": "High"}],
        "history": [{"year": "2024", "desc": "Event"}]
    },
    "warehouses": [{"site": "Location", "status": "Union", "role": "Fulfillment"}],
    "clauses": [{"term": "Term", "def": "Description"}],
    "news": [{"title": "Headline", "date": "Date", "summary": "Info"}]
}`;

        const fetchWithRetry = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    // CHANGED: Using gemini-2.0-flash from your provided model list
                    // const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
                    
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: body }] }],
                            // REQUIRED for v1beta REST: snake_case
                            system_instruction: { 
                                parts: [{ text: sys }] 
                            },
                            generation_config: { 
                                response_mime_type: "application/json" 
                            }
                        })
                    });

                    if (!res.ok) {
                        const errBody = await res.json();
                        throw new Error(errBody.error?.message || `HTTP ${res.status}`);
                    }

                    const result = await res.json();
                    let textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (!textResponse) throw new Error("Empty response from AI model.");
                   
                    const sanitized = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(sanitized);

                } catch (err) {
                    console.warn(`Attempt ${i + 1} failed:`, err.message);
                    if (i === retries - 1) throw err;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        };

        return await fetchWithRetry();
    }

    function render(data) {
        if (!data) return;
        const setUI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
       
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        setUI('compName', data.name);
        setUI('compIndustry', data.industry);
        // setUI('statTotal', Number(data.stats?.total || 0).toLocaleString());
        // setUI('statUnits', data.stats?.units || 0);
        setUI('statJuris', data.stats?.juris || "Provincial");
        setUI('unionRestrictionsBox', data.restrictionText);

        // Change lines like this:
setUI('statTotal', Number(data.stats?.total || 0).toLocaleString());
setUI('statUnits', data.stats?.units || "N/A");

       
        const reLink = document.getElementById('restrictionLink');
        if (data.restrictionUrl) {
            reLink.href = data.restrictionUrl;
            reLink.classList.remove('hidden');
        } else {
            reLink.classList.add('hidden');
        }

        setUI('accuracyText', data.confidence || 95);
        document.getElementById('accuracyRing').style.strokeDasharray = `${data.confidence || 95}, 100`;

        const execSum = document.getElementById('executiveSummary');
        if (execSum && data.summary) {
            execSum.innerHTML = data.summary.map(s => `<p class="flex items-start gap-3"><span class="text-red-600 font-black">▶</span> ${s}</p>`).join('');
        }

        // setUI('valUnion', Number(data.stats?.union || 0).toLocaleString());
        // setUI('valAgency', Number(data.stats?.agency || 0).toLocaleString());
        setUI('valUnion', Number(data.stats?.union || 0).toLocaleString());
setUI('valAgency', Number(data.stats?.agency || 0).toLocaleString());
        
        initCharts(data);

        // Ongoing Negotiations
        const ongoingList = document.getElementById('ongoingList');
        if (data.negs?.ongoing) {
            ongoingList.innerHTML = data.negs.ongoing.map(o => `
                <div class="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl">
                    <h4 class="text-xs font-black text-white uppercase">${o.unit}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${o.status}</p>
                </div>
            `).join('');
        }

        // News
        const newsGrid = document.getElementById('newsGrid');
        if (data.news) {
            newsGrid.innerHTML = data.news.map(n => `
                <div class="p-10 glass-panel rounded-[2.5rem]">
                    <p class="text-[9px] font-black text-red-500 uppercase mb-4">${n.date}</p>
                    <h4 class="text-lg font-bold text-white mb-4">${n.title}</h4>
                    <p class="text-[11px] text-slate-400 italic">"${n.summary}"</p>
                </div>
            `).join('');
        }

        // Asset Ledger
        const assetBody = document.getElementById('assetBody');
        if (data.warehouses) {
            assetBody.innerHTML = data.warehouses.map(w => `
                <tr class="hover:bg-red-950/20 border-b border-slate-800/50">
                    <td class="py-4 font-bold text-slate-200">${w.site}</td>
                    <td class="py-4"><span class="bg-red-600/10 text-red-400 px-2 py-1 rounded text-[8px] font-black">${w.status}</span></td>
                    <td class="py-4 text-slate-500 italic">${w.role}</td>
                </tr>
            `).join('');
        }

        setUI('dynamicCommandText', data.commandTakeaways?.analytics || "Syncing data...");
    }

    // function initCharts(data) {
    //     const pieCtx = document.getElementById('laborPie').getContext('2d');
    //     const lineCtx = document.getElementById('scalingLine').getContext('2d');

    //     if (pieInstance) pieInstance.destroy();
    //     if (lineInstance) lineInstance.destroy();

    //     pieInstance = new Chart(pieCtx, {
    //         type: 'pie',
    //         data: {
    //             labels: ['Union', 'Agency'],
    //             datasets: [{
    //                 data: [data.stats.union, data.stats.agency],
    //                 backgroundColor: ['#dc2626', '#1e293b'],
    //                 borderWidth: 0
    //             }]
    //         },
    //         options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    //     });

    //     lineInstance = new Chart(lineCtx, {
    //         type: 'line',
    //         data: {
    //             labels: data.growth.years,
    //             datasets: [{
    //                 data: data.growth.values,
    //                 borderColor: '#dc2626',
    //                 tension: 0.4,
    //                 fill: true,
    //                 backgroundColor: 'rgba(220, 38, 38, 0.1)'
    //             }]
    //         },
    //         options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    //     });
    // }
function initCharts(data) {
    const pieCtx = document.getElementById('laborPie').getContext('2d');
    const lineCtx = document.getElementById('scalingLine').getContext('2d');

    if (pieInstance) pieInstance.destroy();
    if (lineInstance) lineInstance.destroy();

    // Use default values (0) if stats are missing
    const unionVal = data.stats?.union || 0;
    const agencyVal = data.stats?.agency || 0;

    pieInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Union', 'Agency'],
            datasets: [{
                data: [unionVal, agencyVal],
                backgroundColor: ['#dc2626', '#1e293b'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Use empty arrays if growth data is missing
    const years = data.growth?.years || [];
    const values = data.growth?.values || [];

    lineInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                data: values,
                borderColor: '#dc2626',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(220, 38, 38, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}
    window.switchTab = function(id) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.big-tab').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        document.getElementById('tabBtn-' + id).classList.add('active');
        if (globalData) {
            document.getElementById('dynamicCommandText').textContent = globalData.commandTakeaways[id];
        }
    };

    document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') window.runAudit(); });
}
