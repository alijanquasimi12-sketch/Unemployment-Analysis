// --- KMA² STARTUP SEQUENCE (From Skill) ---
const messages = [
    "Initializing KMA² Intelligence Framework...", 
    "Optimizing Core Data Assets...", 
    "Launching Neural Networks...", 
    "System Ready."
];
document.addEventListener("DOMContentLoaded", () => {
    const msgEl = document.getElementById('loading-msg');
    const progress = document.getElementById('progress-bar');
    const startupScreen = document.getElementById('startup-screen');
    
    const dashboard = document.getElementById('main-dashboard');
    
    if (dashboard && dashboard.id !== 'startup-screen') {
        dashboard.style.display = 'none';
        dashboard.style.opacity = '0';
        dashboard.style.transition = 'opacity 1s';
    }

    let currentMsg = 0;
    setTimeout(() => {
        const interval = setInterval(() => {
            currentMsg++;
            if (currentMsg < messages.length) {
                msgEl.style.opacity = 0;
                setTimeout(() => { msgEl.innerText = messages[currentMsg]; msgEl.style.opacity = 1; }, 500);
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    startupScreen.style.opacity = '0';
                    setTimeout(() => {
                        startupScreen.style.display = 'none';
                        if (dashboard && dashboard.id !== 'startup-screen') {
                            dashboard.style.display = 'block'; 
                            setTimeout(() => dashboard.style.opacity = '1', 50);
                        }
                    }, 1000);
                }, 2000);
            }
        }, 2000);
    }, 5500);

    // Ensure progress bar starts completely empty at 0%
    progress.style.width = '0%';
    
    // Wait until the branding container begins to fade in (5.5s) to start the animation
    setTimeout(() => {
        // Smoothly animate from 0% to 100% over 9.5 seconds
        // This ensures it reaches 100% just before the 15.5s transition to the main app
        progress.style.transition = `width 9.5s linear`;
        progress.style.width = '100%';
    }, 5500);
});

// --- MAIN APPLICATION LOGIC ---

let dashboardData = null;

// Upload Form Submit
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnUpload');
    const alertBox = document.getElementById('uploadAlert');
    const fileInput = document.getElementById('csvFile');
    
    if(fileInput.files.length === 0) return;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Uploading...';
    btn.disabled = true;
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        btn.innerHTML = '<i class="fas fa-upload me-2"></i> Upload & Initialize';
        btn.disabled = false;
        
        if(data.success) {
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-success mt-3';
            alertBox.innerHTML = '<i class="fas fa-check-circle me-2"></i> Dataset successfully initialized.';
            
            // Show Info
            document.getElementById('datasetInfo').style.display = 'block';
            document.getElementById('infoRows').innerText = data.rows.toLocaleString();
            document.getElementById('infoCols').innerText = data.cols.toLocaleString();
            
            // Show Preview
            if(data.preview_html) {
                document.getElementById('datasetPreview').style.display = 'block';
                document.getElementById('previewTableContainer').innerHTML = data.preview_html;
            }
            
            // Enable Clean Tab
            document.getElementById('tab-clean').classList.remove('disabled');
            
            // Pre-fetch cleaning diagnostics
            fetch('/cleaning_summary')
                .then(r => r.json())
                .then(d => {
                    if(d.success) {
                        const list = document.getElementById('diagnosticList');
                        list.innerHTML = `
                            <li class="list-group-item"><i class="fas fa-exclamation-triangle text-warning me-2"></i> Missing Values Detected: <strong>${d.data.missing_values}</strong></li>
                            <li class="list-group-item"><i class="fas fa-copy text-danger me-2"></i> Duplicate Rows Detected: <strong>${d.data.duplicates}</strong></li>
                        `;
                    }
                });
        } else {
            alertBox.style.display = 'block';
            alertBox.className = 'alert alert-danger mt-3';
            alertBox.innerHTML = '<i class="fas fa-times-circle me-2"></i> Error: ' + data.error;
        }
    })
    .catch(error => {
        btn.innerHTML = '<i class="fas fa-upload me-2"></i> Upload & Initialize';
        btn.disabled = false;
        console.error('Error:', error);
    });
});

// Clean Button
document.getElementById('btnClean').addEventListener('click', function() {
    const btn = this;
    const text = document.getElementById('cleanStatusText');
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Executing...';
    btn.disabled = true;
    
    fetch('/clean', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            btn.innerHTML = '<i class="fas fa-check me-2"></i> Cleaning Complete';
            btn.classList.replace('btn-kma-gold', 'btn-success');
            text.innerHTML = "Dataset successfully cleaned, Dates formatted, and duplicates removed. <br><strong>Ready for Analytics.</strong>";
            
            // Enable all tabs
            const tabs = ['tab-eda', 'tab-viz', 'tab-covid', 'tab-insights', 'tab-ai-exec', 'tab-simulate', 'tab-ranking', 'tab-policy', 'tab-early-warning', 'tab-policy-lab', 'tab-report', 'tab-command-center'];
            tabs.forEach(t => document.getElementById(t).classList.remove('disabled'));
            
            // Fetch Dashboard Data
            fetchDashboardData();
        }
    });
});

function fetchDashboardData() {
    fetch('/dashboard_data')
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            dashboardData = data;
            populateDashboard(data);
            
            // Auto-switch to the flagship Executive Command Center upon successful data load
            const execTab = new bootstrap.Tab(document.getElementById('tab-command-center'));
            execTab.show();
        }
    });
}

function updatePlotlyTheme(isLight) {
    const textColor = isLight ? '#1e293b' : '#ffffff';
    const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const update = {
        'font.color': textColor,
        'title.font.color': textColor,
        'xaxis.tickfont.color': textColor,
        'yaxis.tickfont.color': textColor,
        'xaxis.title.font.color': textColor,
        'yaxis.title.font.color': textColor,
        'xaxis.gridcolor': gridColor,
        'yaxis.gridcolor': gridColor,
        'xaxis.zerolinecolor': gridColor,
        'yaxis.zerolinecolor': gridColor,
        'legend.font.color': textColor
    };
    
    const charts = document.querySelectorAll('.js-plotly-plot');
    charts.forEach(chart => {
        if (chart.layout) {
            Plotly.relayout(chart, update);
        }
    });
}

function populateDashboard(data) {
    // 1. EDA Panel
    const edaHtml = `
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Mean Unemployment</h6><h3 class="text-gold">${data.stats.mean_unemployment}%</h3></div></div>
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Median Unemployment</h6><h3 class="text-info">${data.stats.median_unemployment}%</h3></div></div>
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Max Unemployment</h6><h3 class="text-danger">${data.stats.max_unemployment}%</h3></div></div>
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Std Deviation</h6><h3 class="text-light">${data.stats.std_unemployment}</h3></div></div>
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Total Employed Sample</h6><h3 class="text-success">${(data.stats.total_employed/1000000).toFixed(2)}M</h3></div></div>
        <div class="col-md-4"><div class="card glass-card p-3"><h6 class="text-muted">Mean Labour Participation</h6><h3 class="text-primary">${data.stats.mean_participation}%</h3></div></div>
    `;
    document.getElementById('edaCards').innerHTML = edaHtml;

    // Plotly standard config for toolbar and responsiveness
    const plotConfig = {
        displayModeBar: true,
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: [] // Ensure standard tools like Download, Zoom, Pan, Select, Lasso, Autoscale are available
    };

    // 2. Viz Center
    if(data.plots.monthly_trend) Plotly.newPlot('plot_monthly_trend', JSON.parse(data.plots.monthly_trend).data, JSON.parse(data.plots.monthly_trend).layout, plotConfig);
    if(data.plots.state_bar) Plotly.newPlot('plot_state_bar', JSON.parse(data.plots.state_bar).data, JSON.parse(data.plots.state_bar).layout, plotConfig);
    if(data.plots.regional_comp) Plotly.newPlot('plot_regional_comp', JSON.parse(data.plots.regional_comp).data, JSON.parse(data.plots.regional_comp).layout, plotConfig);
    if(data.plots.top_10_high) Plotly.newPlot('plot_top_10_high', JSON.parse(data.plots.top_10_high).data, JSON.parse(data.plots.top_10_high).layout, plotConfig);
    if(data.plots.top_10_low) Plotly.newPlot('plot_top_10_low', JSON.parse(data.plots.top_10_low).data, JSON.parse(data.plots.top_10_low).layout, plotConfig);
    if(data.plots.labour_part) Plotly.newPlot('plot_labour_part', JSON.parse(data.plots.labour_part).data, JSON.parse(data.plots.labour_part).layout, plotConfig);
    if(data.plots.employment_dist) Plotly.newPlot('plot_employment_dist', JSON.parse(data.plots.employment_dist).data, JSON.parse(data.plots.employment_dist).layout, plotConfig);
    if(data.plots.heatmap) Plotly.newPlot('plot_heatmap', JSON.parse(data.plots.heatmap).data, JSON.parse(data.plots.heatmap).layout, plotConfig);
    if(data.plots.correlation) Plotly.newPlot('plot_correlation', JSON.parse(data.plots.correlation).data, JSON.parse(data.plots.correlation).layout, plotConfig);

    // 3. COVID Impact
    if(data.covid) {
        document.getElementById('covid_pre').innerText = data.covid.pre_covid_avg + '%';
        document.getElementById('covid_during').innerText = data.covid.during_covid_avg + '%';
        document.getElementById('covid_inc').innerText = '+' + data.covid.increase_pct + '%';
        document.getElementById('covid_most_affected').innerText = data.covid.most_affected_state;
        document.getElementById('covid_least_affected').innerText = data.covid.least_affected_state;
        if(data.plots.covid_trend) {
            Plotly.newPlot('plot_covid_trend', JSON.parse(data.plots.covid_trend).data, JSON.parse(data.plots.covid_trend).layout, plotConfig);
        }
    }

    // 4. Insights
    if(data.insights) {
        document.getElementById('insightCards').innerHTML = `
            <div class="col-md-6"><div class="card glass-card p-4 border-left-red"><h5>Highest Unemployment</h5><p>${data.insights.highest_state}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4 border-left-gold"><h5>Lowest Unemployment</h5><p>${data.insights.lowest_state}</p></div></div>
            <div class="col-md-12"><div class="card glass-card p-4 border-left-blue"><h5>General Observation</h5><p>${data.insights.general_insight}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4"><h5>Labour Participation</h5><p>${data.insights.labour_participation}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4"><h5>Employment Trends</h5><p>${data.insights.employment_obs}</p></div></div>
        `;
    }

    // 5. Recommendations
    if(data.recommendations) {
        document.getElementById('policyCards').innerHTML = `
            <div class="col-md-6"><div class="card glass-card p-4"><h5><i class="fas fa-coins text-gold me-2"></i> Economic</h5><p>${data.recommendations.economic}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4"><h5><i class="fas fa-users text-primary me-2"></i> Employment</h5><p>${data.recommendations.employment}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4"><h5><i class="fas fa-handshake text-success me-2"></i> Labour Participation</h5><p>${data.recommendations.labour_participation}</p></div></div>
            <div class="col-md-6"><div class="card glass-card p-4"><h5><i class="fas fa-chart-line text-info me-2"></i> Long-term Recovery</h5><p>${data.recommendations.recovery}</p></div></div>
        `;
    }

    // 5.5 AI Executive Insights
    if(data.ai_insights) {
        document.getElementById('aiExecSummary').innerText = data.ai_insights.executive_summary;
        document.getElementById('aiConfidenceBar').style.width = data.ai_insights.confidence + '%';
        document.getElementById('aiConfidenceText').innerText = data.ai_insights.confidence + '%';
        
        const keyFindingsHtml = data.ai_insights.key_findings.map(f => `<li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-check text-gold me-2"></i> ${f}</li>`).join('');
        document.getElementById('aiKeyFindings').innerHTML = keyFindingsHtml;
        
        const actionsHtml = data.ai_insights.recommended_actions.map(a => `<li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-arrow-right text-blue me-2"></i> ${a}</li>`).join('');
        document.getElementById('aiRecommendedActions').innerHTML = actionsHtml;
    }

    // 5.8 AI State Performance Ranking
    if (data.ranking_data) {
        const ranking = data.ranking_data;
        
        // Top 5 Best
        const bestHtml = ranking.top_5_best.map(s => `
            <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center">
                <span><span class="badge bg-secondary me-2">#${s.rank}</span> ${s.state}</span>
                <span class="gold-text fw-bold-fix">${s.ai_score}</span>
            </li>
        `).join('');
        document.getElementById('rankingTopBest').innerHTML = bestHtml;
        
        // Top 5 Worst
        const worstHtml = ranking.top_5_worst.map(s => `
            <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center">
                <span><span class="badge bg-secondary me-2">#${s.rank}</span> ${s.state}</span>
                <span class="text-danger fw-bold-fix">${s.ai_score}</span>
            </li>
        `).join('');
        document.getElementById('rankingTopWorst').innerHTML = worstHtml;
        
        // Insights
        document.getElementById('rankingInsights').innerHTML = `
            <p class="mb-2"><i class="fas fa-arrow-up text-success me-2"></i> ${ranking.insights.top_performer}</p>
            <p class="mb-2"><i class="fas fa-exclamation-circle text-warning me-2"></i> ${ranking.insights.highest_unemployment}</p>
            <p class="mb-2"><i class="fas fa-check-circle text-primary me-2"></i> ${ranking.insights.healthiest_participation}</p>
            <p class="mb-0"><i class="fas fa-radiation text-danger me-2"></i> ${ranking.insights.urgent_intervention}</p>
        `;
        
        // Leaderboard Table
        window.kmaStateRankings = ranking.leaderboard; // Store globally for sorting/filtering
        renderRankingTable(window.kmaStateRankings);
    }

    // 5.9 AI Early Warning Engine
    if (data.early_warning) {
        const ew = data.early_warning;
        
        // National Risk Indicator
        const nrElement = document.getElementById('ewNationalRisk');
        nrElement.innerText = ew.national_risk;
        nrElement.className = `mb-3 text-${ew.national_risk_color}`;
        document.getElementById('ewConfidenceBar').style.width = ew.confidence + '%';
        document.getElementById('ewConfidenceText').innerText = ew.confidence + '%';
        
        // AI Explanation
        document.getElementById('ewExplanation').innerText = ew.explanation;
        
        // Risk Category Distribution
        document.getElementById('ewCountRed').innerText = ew.distribution.Red;
        document.getElementById('ewCountOrange').innerText = ew.distribution.Orange;
        document.getElementById('ewCountYellow').innerText = ew.distribution.Yellow;
        document.getElementById('ewCountGreen').innerText = ew.distribution.Green;
        
        // Top 5 Priority States
        const hotspotsHtml = ew.top_5_priority.map(s => `
            <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center">
                <span><i class="fas fa-exclamation-circle text-${s.color_class} me-2"></i> ${s.state}</span>
                <span class="text-${s.color_class} fw-bold-fix">${s.unemployment}%</span>
            </li>
        `).join('');
        document.getElementById('ewTopPriority').innerHTML = hotspotsHtml || `<li class="list-group-item bg-transparent text-light border-secondary">No critical hotspots detected.</li>`;
        
        // Recommendations
        const recsHtml = ew.recommendations.map(r => `
            <li class="list-group-item bg-transparent text-light border-secondary">
                <i class="fas fa-check text-blue me-2"></i> ${r}
            </li>
        `).join('');
        document.getElementById('ewRecommendations').innerHTML = recsHtml;
        
        // Full Queue Table
        const queueHtml = ew.all_warnings.map(s => `
            <tr>
                <td class="text-start fw-bold-fix">${s.state}</td>
                <td>${s.unemployment}%</td>
                <td>${s.max_unemployment}%</td>
                <td><span class="badge bg-${s.color_class} ${['warning', 'info'].includes(s.color_class) ? 'text-dark' : ''} px-3 py-2">${s.category}</span></td>
            </tr>
        `).join('');
        document.getElementById('ewFullQueueTable').innerHTML = queueHtml;
    }

    // 5.10 AI Policy Decision Lab
    if (data.policy_lab) {
        window.kmaPolicyLabData = data.policy_lab;
        
        // Populate Dropdown
        const select = document.getElementById('policyLabSelect');
        select.innerHTML = data.policy_lab.policies.map((p, index) => 
            `<option value="${index}">${p.rank}. ${p.name}</option>`
        ).join('');
        
        // Render Comparative Table
        const tableBody = document.getElementById('plComparativeTable');
        tableBody.innerHTML = data.policy_lab.policies.map(p => {
            const badgeColor = p.priority === 'Critical' ? 'bg-danger' : (p.priority === 'High' ? 'bg-warning text-dark' : (p.priority === 'Medium' ? 'bg-primary' : 'bg-secondary'));
            return `
            <tr>
                <td class="fw-bold-fix">#${p.rank}</td>
                <td class="text-start">${p.name}</td>
                <td class="gold-text fw-bold-fix">${p.ai_impact_score}</td>
                <td class="text-info">${p.est_emp_growth}</td>
                <td><span class="badge ${badgeColor} px-3 py-2">${p.priority}</span></td>
            </tr>
            `;
        }).join('');
        
        // Trigger initial update
        if(window.updatePolicyLabDashboard) {
            window.updatePolicyLabDashboard();
        }
    }

    // 6. Build Report
    document.getElementById('reportContent').innerHTML = `
        <div class="mb-4">
            <h4 class="text-gold">1. Project Overview</h4>
            <p>This report presents the analysis of the unemployment dataset <strong>${data.filename}</strong>, processed and cleaned through the KMA² Intelligence Pipeline.</p>
        </div>
        <div class="mb-4">
            <h4 class="text-gold">2. Key Statistical Findings</h4>
            <ul>
                <li><strong>Average Unemployment Rate:</strong> ${data.stats.mean_unemployment}%</li>
                <li><strong>Peak Unemployment Rate:</strong> ${data.stats.max_unemployment}%</li>
                <li><strong>Average Labour Participation:</strong> ${data.stats.mean_participation}%</li>
                <li><strong>Highest Affected Region:</strong> ${data.insights.highest_state}</li>
            </ul>
        </div>
        <div class="mb-4">
            <h4 class="text-gold">3. COVID-19 Impact Assessment</h4>
            <p>The transition into the COVID-19 lockdown period caused severe disruptions. Unemployment rates escalated from an average of <strong>${data.covid.pre_covid_avg}%</strong> pre-lockdown to <strong>${data.covid.during_covid_avg}%</strong> during the lockdown period, marking a massive surge of <strong>+${data.covid.increase_pct}%</strong>.</p>
        </div>
        <div class="mb-4">
            <h4 class="text-gold">4. Strategic Recommendations</h4>
            <ul>
                <li>${data.recommendations.economic}</li>
                <li>${data.recommendations.employment}</li>
                <li>${data.recommendations.labour_participation}</li>
                <li>${data.recommendations.recovery}</li>
            </ul>
        </div>
        
        ${(() => {
            const cc = data.command_center || {};
            const intel = cc.intel_summary || {};
            const kpi = cc.kpi_header || {};
            const ach = cc.achievement_panel || {};
            const ready = cc.readiness_meter || {};
            const ew = data.early_warning || {};
            const topPolicy = data.policy_lab && data.policy_lab.policies && data.policy_lab.policies.length > 0 
                              ? data.policy_lab.policies[0].name 
                              : 'N/A';
            return `
            <div class="mb-5 mt-5">
                <h4 class="text-gold mb-4 border-bottom border-secondary pb-2">5. Complete Project Intelligence Summary</h4>
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-database me-2 text-primary"></i> Dataset Management</strong>
                            <p class="text-muted small m-0">Successfully ingested and validated <strong>${data.filename}</strong> comprising ${data.stats?.dataset_length || 'all'} critical records. System established a robust foundation for subsequent analytical pipelines.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-broom me-2 text-info"></i> Data Cleaning</strong>
                            <p class="text-muted small m-0">Executed automated data sanitization protocols. Dataset quality stabilized at <strong>${kpi.dataset_quality || 'Optimal'}</strong>, ensuring zero analytical variance due to missing or corrupt values.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-chart-pie me-2 text-warning"></i> Exploratory Data Analysis (EDA)</strong>
                            <p class="text-muted small m-0">Extracted baseline statistical vectors. Detected a national average unemployment rate of <strong>${data.stats?.mean_unemployment || 0}%</strong> against a labour participation rate of <strong>${data.stats?.mean_participation || 0}%</strong>.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-chart-bar me-2 text-success"></i> Visualization Center</strong>
                            <p class="text-muted small m-0">Generated multi-dimensional visual matrices. Identified stark regional disparities, highlighting <strong>${ach.best_performing || 'specific'}</strong> and <strong>${ach.most_critical || 'specific'}</strong> states.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-virus me-2 text-danger"></i> COVID-19 Impact Analysis</strong>
                            <p class="text-muted small m-0">Quantified lockdown disruption. Calculated a massive <strong>+${data.covid?.increase_pct || 0}%</strong> spike, driving unemployment from ${data.covid?.pre_covid_avg || 0}% to a severe ${data.covid?.during_covid_avg || 0}%.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-lightbulb me-2 text-warning"></i> AI Insight Engine</strong>
                            <p class="text-muted small m-0">Deployed machine learning pattern recognition. Established that <strong>${intel.best_region || 'optimized zones'}</strong> displayed the highest resilience, while others required immediate systemic intervention.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-user-tie me-2 text-gold"></i> AI Executive Insights</strong>
                            <p class="text-muted small m-0">Formulated high-level strategic directives. Identified <strong>${intel.critical_region || 'vulnerable areas'}</strong> as the primary bottleneck to nationwide economic recovery.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-sliders-h me-2 text-info"></i> Scenario Simulator</strong>
                            <p class="text-muted small m-0">Activated predictive modeling. Validated potential socio-economic outcomes by perturbing employment matrices, allowing real-time 'what-if' policy testing.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-medal me-2 text-gold"></i> State Ranking Engine</strong>
                            <p class="text-muted small m-0">Ranked all <strong>${kpi.total_states || 'available'}</strong> state territories using a composite AI index, establishing a clear hierarchy of economic performance and structural vulnerability.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-balance-scale me-2 text-primary"></i> AI Policy Decision Lab</strong>
                            <p class="text-muted small m-0">Simulated legislative actions. The engine isolated <strong>${topPolicy}</strong> as the optimal intervention path to maximize job creation.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-exclamation-triangle me-2 text-danger"></i> Early Warning System</strong>
                            <p class="text-muted small m-0">Triggered systemic alert protocols. The national risk is currently assessed at <strong>${ew.national_risk || 'Monitor'}</strong>, driven by cascading structural deficits in critical hotspots.</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border border-secondary rounded h-100" style="background: rgba(255,255,255,0.02);">
                            <strong class="d-block mb-2 text-light"><i class="fas fa-chess-king me-2 text-gold"></i> Executive Command Center</strong>
                            <p class="text-muted small m-0">Aggregated all 11 sub-modules into a unified dashboard. Synthesized real-time data streams to generate final overarching intelligence at <strong>${kpi.ai_confidence || '0'}%</strong> confidence.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-5">
                <h4 class="text-gold mb-3 border-bottom border-secondary pb-2">6. Overall Executive Conclusion</h4>
                <div class="p-4 rounded border-left-gold" style="background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.2);">
                    <p class="text-light m-0" style="font-size: 1.1rem; line-height: 1.7;">
                        Through the deployment of the K.M.A² Intelligence Framework across <strong>${kpi.total_states || 'all'}</strong> analyzed regions, the system has evaluated deep structural trends and the severe disruption pattern of the COVID-19 pandemic. The analysis confirms a <strong>${ew.national_risk || 'Significant'}</strong> national risk level. While states such as <strong>${ach.best_performing || 'certain regions'}</strong> demonstrate economic resilience, the ongoing vulnerability in <strong>${ach.most_critical || 'other regions'}</strong> presents a systemic threat. Immediate adoption of <strong>${topPolicy}</strong> is highly recommended to stabilize the workforce, mitigate cascading economic damage, and elevate the national readiness status from its current level of <strong>${ready.level || 'Unknown'}</strong>.
                    </p>
                </div>
            </div>

            <div class="mb-4">
                <h4 class="text-gold mb-4 border-bottom border-secondary pb-2">7. Executive Recommendation Matrix</h4>
                <div class="card glass-card p-4">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <ul class="list-group list-group-flush kma-list">
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
                                    <span><i class="fas fa-trophy text-gold me-2"></i> Highest Performing State</span>
                                    <strong class="text-success">${ach.best_performing || '-'}</strong>
                                </li>
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
                                    <span><i class="fas fa-radiation text-danger me-2"></i> Highest Risk State</span>
                                    <strong class="text-danger">${ach.most_critical || '-'}</strong>
                                </li>
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
                                    <span class="me-3 flex-shrink-0"><i class="fas fa-exclamation-circle text-warning me-2"></i> Key Concern</span>
                                    <strong class="text-warning text-end" style="word-wrap: break-word; white-space: normal;">${intel.highest_concerns || '-'}</strong>
                                </li>
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center border-bottom-0 py-3">
                                    <span class="me-3 flex-shrink-0"><i class="fas fa-balance-scale text-primary me-2"></i> Best Policy Action</span>
                                    <strong class="text-info text-end" style="word-wrap: break-word; white-space: normal;">${topPolicy}</strong>
                                </li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <ul class="list-group list-group-flush kma-list h-100">
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
                                    <span><i class="fas fa-brain text-info me-2"></i> AI Confidence</span>
                                    <strong class="text-success">${kpi.ai_confidence || '0'}%</strong>
                                </li>
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
                                    <span><i class="fas fa-tachometer-alt text-success me-2"></i> Readiness Status</span>
                                    <strong style="color: ${ready.color || '#fff'}">${ready.level || '-'}</strong>
                                </li>
                                <li class="list-group-item bg-transparent text-light border-secondary d-flex flex-column justify-content-center border-bottom-0 mt-3 p-4 rounded" style="background: rgba(255,255,255,0.05);">
                                    <span class="mb-2 text-center"><i class="fas fa-signature text-gold me-2"></i> Final Government Recommendation</span>
                                    <strong class="text-gold text-center" style="font-size: 1rem; line-height: 1.5;">${cc.final_recommendation || '-'}</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            `;
        })()}
        
        <hr>
        <div class="text-center mt-5">
            <p class="text-muted small">Generated by KMA² Advanced Unemployment Intelligence System | ${new Date().toLocaleString()}</p>
        </div>
    `;
    
    // Ensure initial theme is correct for plots
    const isLight = document.body.classList.contains('kma-light-theme');
    if (isLight) {
        setTimeout(() => updatePlotlyTheme(true), 50);
    }

    // Pre-fill Simulator inputs with average stats
    if(data.stats) {
        document.getElementById('simUnemployment').value = data.stats.mean_unemployment;
        document.getElementById('simEmployed').value = Math.round(data.stats.total_employed / data.stats.dataset_length || data.stats.total_employed / 100); // Approximate average employed
        document.getElementById('simParticipation').value = data.stats.mean_participation;
    }

    // --- AI Executive Command Center Population ---
    if(data.command_center) {
        const cc = data.command_center;
        
        // 1. KPI Header
        document.getElementById('ccHealthScore').innerText = cc.kpi_header.health_score;
        document.getElementById('ccDatasetQuality').innerText = cc.kpi_header.dataset_quality;
        document.getElementById('ccConfidence').innerText = cc.kpi_header.ai_confidence + '%';
        document.getElementById('ccNationalRisk').innerText = cc.kpi_header.national_risk;
        
        // Color code national risk
        const riskEl = document.getElementById('ccNationalRisk');
        riskEl.className = 'fw-bold-fix m-0';
        if(cc.kpi_header.national_risk === 'Low' || cc.kpi_header.national_risk === 'Stable') riskEl.classList.add('text-success');
        else if(cc.kpi_header.national_risk === 'Moderate' || cc.kpi_header.national_risk === 'Monitor') riskEl.classList.add('text-warning');
        else if(cc.kpi_header.national_risk === 'High' || cc.kpi_header.national_risk === 'Elevated') riskEl.classList.add('text-danger');
        else riskEl.classList.add('text-danger');
        
        document.getElementById('ccTotalStates').innerText = cc.kpi_header.total_states;
        document.getElementById('ccDatasetName').innerText = cc.kpi_header.active_dataset;
        document.getElementById('ccDatasetName').title = cc.kpi_header.active_dataset;
        
        // 2. Intel Summary
        document.getElementById('ccIntelSituation').innerText = cc.intel_summary.current_situation;
        document.getElementById('ccIntelStrongest').innerText = cc.intel_summary.strongest_findings;
        document.getElementById('ccIntelConcerns').innerText = cc.intel_summary.highest_concerns;
        document.getElementById('ccIntelBest').innerText = cc.intel_summary.best_region;
        document.getElementById('ccIntelCritical').innerText = cc.intel_summary.critical_region;
        document.getElementById('ccIntelRec').innerText = cc.intel_summary.overall_recommendation;
        
        // 3. Cross Module
        document.getElementById('ccCmDataset').innerText = cc.cross_module.dataset;
        document.getElementById('ccCmCleaning').innerText = cc.cross_module.cleaning;
        document.getElementById('ccCmEda').innerText = cc.cross_module.eda;
        document.getElementById('ccCmViz').innerText = cc.cross_module.viz;
        document.getElementById('ccCmCovid').innerText = cc.cross_module.covid;
        document.getElementById('ccCmInsight').innerText = cc.cross_module.insight;
        document.getElementById('ccCmScenario').innerText = cc.cross_module.scenario;
        document.getElementById('ccCmRanking').innerText = cc.cross_module.ranking;
        document.getElementById('ccCmWarning').innerText = cc.cross_module.early_warning;
        document.getElementById('ccCmPolicy').innerText = cc.cross_module.policy;
        document.getElementById('ccCmReport').innerText = cc.cross_module.report;
        
        // 4. Priority Panel
        const tbody = document.getElementById('ccPriorityTableBody');
        tbody.innerHTML = '';
        if(cc.priority_panel && cc.priority_panel.length > 0) {
            cc.priority_panel.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td class="text-start ps-4 fw-bold">${p.state}</td>
                        <td class="opacity-75">${p.reason}</td>
                        <td>${p.action}</td>
                        <td class="pe-4 text-end"><span class="badge bg-${p.badge}">${p.priority}</span></td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-muted">No priorities generated.</td></tr>';
        }
        
        // 5. Achievement Panel
        document.getElementById('ccAchBest').innerText = cc.achievement_panel.best_performing;
        document.getElementById('ccAchEmp').innerText = cc.achievement_panel.highest_employment;
        document.getElementById('ccAchUnemp').innerText = cc.achievement_panel.lowest_unemployment;
        document.getElementById('ccAchPart').innerText = cc.achievement_panel.highest_participation;
        document.getElementById('ccAchScore').innerText = cc.achievement_panel.highest_ai_score;
        document.getElementById('ccAchCritical').innerText = cc.achievement_panel.most_critical;
        
        // 6. Readiness Meter
        document.getElementById('ccReadinessScore').innerText = cc.readiness_meter.score;
        document.getElementById('ccReadinessLevel').innerText = cc.readiness_meter.level;
        document.getElementById('ccReadinessScore').style.color = cc.readiness_meter.color;
        document.getElementById('ccReadinessLevel').style.color = cc.readiness_meter.color;
        
        // Animate the circle
        setTimeout(() => {
            const circle = document.getElementById('ccReadinessCircle');
            if (circle) {
                circle.style.stroke = cc.readiness_meter.color;
                circle.style.strokeDasharray = `${cc.readiness_meter.score}, 100`;
            }
        }, 500); // Slight delay for animation effect
        
        // 7. Final Recommendation
        document.getElementById('ccFinalRec').innerText = cc.final_recommendation;
    }
}

// Ensure Plotly resizes when tabs change
document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function (event) {
        window.dispatchEvent(new Event('resize'));
    });
});

// --- K.M.A² Signature Series Modal Logic ---
document.addEventListener("DOMContentLoaded", () => {
    const signatureBtn = document.getElementById('signatureSeriesBtn');
    const signatureModal = document.getElementById('signatureModal');
    const signatureCloseTop = document.getElementById('signatureCloseTop');
    const signatureCloseBottom = document.getElementById('signatureCloseBottom');

    if (signatureBtn && signatureModal) {
        const openModal = () => {
            signatureModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        };
        
        const closeModal = () => {
            signatureModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        signatureBtn.addEventListener('click', openModal);
        signatureCloseTop.addEventListener('click', closeModal);
        signatureCloseBottom.addEventListener('click', closeModal);

        // Close on outside click
        signatureModal.addEventListener('click', (e) => {
            if (e.target === signatureModal) {
                closeModal();
            }
        });
    }
    
    // --- Settings Panel Logic ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseTop = document.getElementById('settingsCloseTop');
    
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    
    // Sub Modals
    const aboutDeveloperBtn = document.getElementById('aboutDeveloperBtn');
    const aboutProjectBtn = document.getElementById('aboutProjectBtn');
    const aboutDeveloperModal = document.getElementById('aboutDeveloperModal');
    const aboutProjectModal = document.getElementById('aboutProjectModal');
    const devCloseTop = document.getElementById('devCloseTop');
    const projectCloseTop = document.getElementById('projectCloseTop');
    
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        const closeSettings = () => {
            settingsModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (settingsCloseTop) settingsCloseTop.addEventListener('click', closeSettings);

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });
    }

    const devCloseBottom = document.getElementById('devCloseBottom');
    const devIntroOverlay = document.getElementById('devIntroOverlay');

    if (aboutDeveloperBtn && aboutDeveloperModal) {
        aboutDeveloperBtn.addEventListener('click', () => {
            // STEP 1: Fade to black
            if(devIntroOverlay) {
                devIntroOverlay.classList.add('active');
                
                // STEP 2: Animate Logo
                setTimeout(() => {
                    devIntroOverlay.classList.add('animate-logo');
                }, 100);

                // STEP 3: Animate Text after 1.5s
                setTimeout(() => {
                    devIntroOverlay.classList.add('animate-text');
                }, 1600);

                // STEP 4: Open panel after 3s total
                setTimeout(() => {
                    devIntroOverlay.classList.remove('active', 'animate-logo', 'animate-text');
                    aboutDeveloperModal.classList.add('active');
                }, 3600);
            } else {
                aboutDeveloperModal.classList.add('active');
            }
        });
        
        const closeDev = () => aboutDeveloperModal.classList.remove('active');
        if (devCloseTop) devCloseTop.addEventListener('click', closeDev);
        if (devCloseBottom) devCloseBottom.addEventListener('click', closeDev);
        aboutDeveloperModal.addEventListener('click', (e) => {
            if (e.target === aboutDeveloperModal) closeDev();
        });
    }

    const projectCloseBottom = document.getElementById('projectCloseBottom');

    const projectIntroOverlay = document.getElementById('projectIntroOverlay');

    if (aboutProjectBtn && aboutProjectModal) {
        aboutProjectBtn.addEventListener('click', () => {
            // STEP 1: Fade to black
            if(projectIntroOverlay) {
                projectIntroOverlay.classList.add('active');
                
                // STEP 2: Animate Logo
                setTimeout(() => {
                    projectIntroOverlay.classList.add('animate-logo');
                }, 100);

                // STEP 3: Animate Text after 1.5s
                setTimeout(() => {
                    projectIntroOverlay.classList.add('animate-text');
                }, 1600);

                // STEP 4: Open panel after 3s total
                setTimeout(() => {
                    projectIntroOverlay.classList.remove('active', 'animate-logo', 'animate-text');
                    aboutProjectModal.classList.add('active');
                }, 3600);
            } else {
                aboutProjectModal.classList.add('active');
            }
        });
        const closeProject = () => aboutProjectModal.classList.remove('active');
        if (projectCloseTop) projectCloseTop.addEventListener('click', closeProject);
        if (projectCloseBottom) projectCloseBottom.addEventListener('click', closeProject);
        aboutProjectModal.addEventListener('click', (e) => {
            if (e.target === aboutProjectModal) closeProject();
        });
    }
    
    // Logo Info Modal Logic
    const headerLogo = document.querySelector('.kma-header-logo');
    const logoInfoModal = document.getElementById('logoInfoModal');
    const logoInfoCloseTop = document.getElementById('logoInfoCloseTop');
    const logoInfoCloseBottom = document.getElementById('logoInfoCloseBottom');

    if (headerLogo && logoInfoModal) {
        headerLogo.style.cursor = 'pointer';
        headerLogo.addEventListener('click', () => {
            logoInfoModal.classList.add('active');
        });

        const closeLogoInfo = () => logoInfoModal.classList.remove('active');
        if (logoInfoCloseTop) logoInfoCloseTop.addEventListener('click', closeLogoInfo);
        if (logoInfoCloseBottom) logoInfoCloseBottom.addEventListener('click', closeLogoInfo);
        logoInfoModal.addEventListener('click', (e) => {
            if (e.target === logoInfoModal) closeLogoInfo();
        });
    }
    // Theme Switcher Logic
    const currentTheme = localStorage.getItem('kmaTheme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.replace('kma-dark-theme', 'kma-light-theme');
        if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Toggle to Dark
                if (document.body.classList.contains('kma-light-theme')) {
                    document.body.classList.replace('kma-light-theme', 'kma-dark-theme');
                } else {
                    document.body.classList.add('kma-dark-theme');
                }
                localStorage.setItem('kmaTheme', 'dark');
                updatePlotlyTheme(false);
            } else {
                // Toggle to Light
                if (document.body.classList.contains('kma-dark-theme')) {
                    document.body.classList.replace('kma-dark-theme', 'kma-light-theme');
                } else {
                    document.body.classList.add('kma-light-theme');
                }
                localStorage.setItem('kmaTheme', 'light');
                updatePlotlyTheme(true);
            }
        });
    }

    // --- Executive Access Modal Logic ---
    const execAccessBtn = document.getElementById('execAccessBtn');
    const execAccessModal = document.getElementById('execAccessModal');
    const execAccessCloseTop = document.getElementById('execAccessCloseTop');
    const execAccessCloseBottom = document.getElementById('execAccessCloseBottom');

    if (execAccessBtn && execAccessModal) {
        const openExecModal = () => {
            execAccessModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
        
        const closeExecModal = () => {
            execAccessModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        execAccessBtn.addEventListener('click', openExecModal);
        if (execAccessCloseTop) execAccessCloseTop.addEventListener('click', closeExecModal);
        if (execAccessCloseBottom) execAccessCloseBottom.addEventListener('click', closeExecModal);

        execAccessModal.addEventListener('click', (e) => {
            if (e.target === execAccessModal) closeExecModal();
        });
    }

    // Global ESC Key Listener to Close Modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModals = document.querySelectorAll('.signature-modal-overlay.active');
            activeModals.forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    // --- Scenario Simulator Logic ---
    const simForm = document.getElementById('simulationForm');
    if (simForm) {
        simForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSimulate');
            const unemp = document.getElementById('simUnemployment').value;
            const emp = document.getElementById('simEmployed').value;
            const part = document.getElementById('simParticipation').value;
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Analyzing...';
            btn.disabled = true;
            
            fetch('/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unemployment_rate: unemp,
                    employed: emp,
                    participation_rate: part
                })
            })
            .then(res => res.json())
            .then(data => {
                btn.innerHTML = '<i class="fas fa-brain me-2"></i> Run AI Simulation';
                btn.disabled = false;
                
                if (data.success && data.data) {
                    const res = data.data;
                    
                    // Risk Level
                    document.getElementById('simRiskLevel').innerText = res.risk_level;
                    document.getElementById('simRiskLevel').className = `mb-3 text-${res.risk_color}`;
                    
                    // Confidence
                    document.getElementById('simConfidenceBar').style.width = res.confidence + '%';
                    document.getElementById('simConfidenceText').innerText = res.confidence + '%';
                    
                    // Comparison
                    document.getElementById('simCompUnemp').innerHTML = `${res.comparison.unemployment.current} &rarr; ${res.comparison.unemployment.simulated} <span class="ms-1 ${res.comparison.unemployment.worsened ? 'text-danger' : 'text-success'}">(${res.comparison.unemployment.diff > 0 ? '+' : ''}${res.comparison.unemployment.diff})</span>`;
                    document.getElementById('simCompEmp').innerHTML = `${res.comparison.employed.current.toLocaleString()} &rarr; ${res.comparison.employed.simulated.toLocaleString()} <span class="ms-1 ${res.comparison.employed.worsened ? 'text-danger' : 'text-success'}">(${res.comparison.employed.diff > 0 ? '+' : ''}${res.comparison.employed.diff.toLocaleString()})</span>`;
                    document.getElementById('simCompPart').innerHTML = `${res.comparison.participation.current} &rarr; ${res.comparison.participation.simulated} <span class="ms-1 ${res.comparison.participation.worsened ? 'text-danger' : 'text-success'}">(${res.comparison.participation.diff > 0 ? '+' : ''}${res.comparison.participation.diff})</span>`;
                    
                    // AI Interpretation
                    document.getElementById('simInterpretation').innerText = res.ai_interpretation;
                    
                    // Policy Recs
                    const recsHtml = res.recommendations.map(r => `<li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-check text-gold me-2"></i> ${r}</li>`).join('');
                    document.getElementById('simRecommendations').innerHTML = recsHtml;
                    
                    // Summary List
                    const sumHtml = `
                        <li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-layer-group text-blue me-2"></i> Scenario Type: <span class="float-end fw-bold">${res.summary.scenario_type}</span></li>
                        <li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-exclamation-triangle text-warning me-2"></i> Estimated Risk: <span class="float-end fw-bold text-${res.risk_color}">${res.summary.estimated_risk}</span></li>
                        <li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-briefcase text-success me-2"></i> Employment Outlook: <span class="float-end fw-bold">${res.summary.employment_outlook}</span></li>
                        <li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-chart-bar text-gold me-2"></i> Economic Stability: <span class="float-end fw-bold">${res.summary.economic_stability}</span></li>
                        <li class="list-group-item bg-transparent text-light border-secondary"><i class="fas fa-flag text-danger me-2"></i> Priority Action: <span class="float-end fw-bold">${res.summary.suggested_priority}</span></li>
                    `;
                    document.getElementById('simSummaryList').innerHTML = sumHtml;
                }
            })
            .catch(err => {
                btn.innerHTML = '<i class="fas fa-brain me-2"></i> Run AI Simulation';
                btn.disabled = false;
                console.error(err);
            });
        });
    }

    // --- State Ranking Logic ---
    window.renderRankingTable = function(dataArray) {
        const tbody = document.getElementById('rankingTableBody');
        if (!tbody) return;
        
        if (!dataArray || dataArray.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-muted">No states found matching your criteria.</td></tr>`;
            return;
        }
        
        const html = dataArray.map(item => `
            <tr>
                <td class="fw-bold-fix">#${item.rank}</td>
                <td class="text-start fw-bold-fix">${item.state}</td>
                <td>${item.unemployment}%</td>
                <td>${item.employed.toLocaleString()}</td>
                <td>${item.participation}%</td>
                <td class="gold-text fw-bold-fix">${item.ai_score}</td>
                <td><span class="badge bg-${item.status_color} ${item.status_color === 'warning' ? 'text-dark' : ''} px-3 py-2">${item.status}</span></td>
            </tr>
        `).join('');
        
        tbody.innerHTML = html;
    };
    
    const rankingSearch = document.getElementById('rankingSearch');
    const rankingFilter = document.getElementById('rankingFilter');
    
    function applyRankingFilters() {
        if (!window.kmaStateRankings) return;
        
        let filtered = [...window.kmaStateRankings];
        
        // Apply Search
        const searchTerm = rankingSearch.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(item => item.state.toLowerCase().includes(searchTerm));
        }
        
        // Apply Sort
        const filterVal = rankingFilter.value;
        if (filterVal === 'score_desc') filtered.sort((a, b) => b.ai_score - a.ai_score);
        else if (filterVal === 'score_asc') filtered.sort((a, b) => a.ai_score - b.ai_score);
        else if (filterVal === 'unemp_desc') filtered.sort((a, b) => b.unemployment - a.unemployment);
        else if (filterVal === 'unemp_asc') filtered.sort((a, b) => a.unemployment - b.unemployment);
        else if (filterVal === 'part_desc') filtered.sort((a, b) => b.participation - a.participation);
        
        renderRankingTable(filtered);
    }
    
    if (rankingSearch) {
        rankingSearch.addEventListener('input', applyRankingFilters);
    }
    
    if (rankingFilter) {
        rankingFilter.addEventListener('change', applyRankingFilters);
    }

    // --- Scroll To Top Logic ---
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                scrollToTopBtn.classList.add("show");
            } else {
                scrollToTopBtn.classList.remove("show");
            }
        });
        
        scrollToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

// --- Policy Lab Logic ---
window.updatePolicyLabDashboard = function() {
    if (!window.kmaPolicyLabData) return;
    const select = document.getElementById('policyLabSelect');
    const policy = window.kmaPolicyLabData.policies[select.value];
    if (!policy) return;

    // Update Dashboard Cards
    document.getElementById('plUnempReduction').innerText = policy.est_unemp_reduction + '%';
    document.getElementById('plEmpGrowth').innerText = policy.est_emp_growth;
    document.getElementById('plInvestment').innerText = policy.investment;
    document.getElementById('plTimeline').innerText = policy.timeline;
    document.getElementById('plImpactScore').innerText = policy.ai_impact_score + '/100';
    document.getElementById('plConfidence').innerText = policy.ai_confidence + '%';

    // Update Interpretation
    document.getElementById('plExplainWhy').innerText = policy.explanation.why;
    document.getElementById('plExplainBenefits').innerText = policy.explanation.benefits;
    document.getElementById('plExplainLimits').innerText = policy.explanation.limitations;
    document.getElementById('plExplainLongTerm').innerText = policy.explanation.long_term;
    document.getElementById('plExplainRec').innerText = policy.explanation.recommendation;

    // Update Strategic Recommendations
    document.getElementById('plStratImm').innerText = policy.strategic.immediate;
    document.getElementById('plStratShort').innerText = policy.strategic.short_term;
    document.getElementById('plStratLong').innerText = policy.strategic.long_term;
    document.getElementById('plStratBudget').innerText = policy.strategic.budget;
    document.getElementById('plStratWorkforce').innerText = policy.strategic.workforce;
};
