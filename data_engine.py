import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import plotly.io as pio

class DataEngine:
    def __init__(self):
        self.df = None
        self.df_clean = None
        self.filename = None

    def load_data(self, filepath, filename):
        self.filename = filename
        try:
            self.df = pd.read_csv(filepath)
            # Strip whitespace from column names
            self.df.columns = self.df.columns.str.strip()
            
            # Identify columns
            # The exact names depend on the dataset, let's normalize them
            self.df.rename(columns={
                'Estimated Unemployment Rate (%)': 'Unemployment_Rate',
                'Estimated Employed': 'Employed',
                'Estimated Labour Participation Rate (%)': 'Labour_Participation_Rate'
            }, inplace=True)
            
            return {
                "success": True,
                "rows": len(self.df),
                "cols": len(self.df.columns),
                "columns": list(self.df.columns),
                "dtypes": self.df.dtypes.astype(str).to_dict(),
                "preview_html": self.df.head().to_html(classes="table table-dark table-striped table-bordered mt-3 kma-table", index=False)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_cleaning_summary(self):
        if self.df is None: return None
        return {
            "missing_values": int(self.df.isnull().sum().sum()),
            "missing_by_col": self.df.isnull().sum().to_dict(),
            "duplicates": int(self.df.duplicated().sum())
        }

    def clean_data(self):
        if self.df is None: return False
        
        # Drop duplicates
        df_cleaned = self.df.drop_duplicates()
        
        # Drop NA
        df_cleaned = df_cleaned.dropna()
        
        # Convert Date if exists
        if 'Date' in df_cleaned.columns:
            df_cleaned['Date'] = pd.to_datetime(df_cleaned['Date'].str.strip(), format="%d-%m-%Y", errors='coerce')
            
            # Extract Month, Year for easier analysis
            df_cleaned['Month_Name'] = df_cleaned['Date'].dt.month_name()
            df_cleaned['Year'] = df_cleaned['Date'].dt.year
            df_cleaned['Month'] = df_cleaned['Date'].dt.month
            
        # Ensure core columns are numeric
        for col in ['Unemployment_Rate', 'Employed', 'Labour_Participation_Rate']:
            if col in df_cleaned.columns:
                df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce')
        
        self.df_clean = df_cleaned
        return True

    def get_eda_stats(self):
        if self.df_clean is None: return None
        df = self.df_clean
        
        stats = {
            "mean_unemployment": round(df['Unemployment_Rate'].mean(), 2),
            "median_unemployment": round(df['Unemployment_Rate'].median(), 2),
            "max_unemployment": round(df['Unemployment_Rate'].max(), 2),
            "min_unemployment": round(df['Unemployment_Rate'].min(), 2),
            "std_unemployment": round(df['Unemployment_Rate'].std(), 2),
            "total_employed": int(df['Employed'].sum()),
            "mean_participation": round(df['Labour_Participation_Rate'].mean(), 2),
            "dataset_length": len(df)
        }
        return stats

    def _get_plotly_layout(self, title):
        return {
            "title": {"text": title, "font": {"color": "#FFFFFF", "family": "Rajdhani", "size": 24}},
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "font": {"color": "#FFFFFF", "family": "Rajdhani", "size": 16},
            "xaxis": {"gridcolor": "rgba(255,255,255,0.1)", "zerolinecolor": "rgba(255,255,255,0.1)", "title_font": {"size": 18}, "tickfont": {"size": 14}},
            "yaxis": {"gridcolor": "rgba(255,255,255,0.1)", "zerolinecolor": "rgba(255,255,255,0.1)", "title_font": {"size": 18}, "tickfont": {"size": 14}},
            "legend": {"font": {"size": 16}},
            "colorway": ["#D4AF37", "#4A90E2", "#E74C3C", "#2ECC71", "#9B59B6"],
            "hoverlabel": {"font": {"size": 16}},
            "margin": {"l": 50, "r": 30, "t": 60, "b": 50}
        }

    def generate_plots(self):
        if self.df_clean is None: return {}
        df = self.df_clean
        
        plots = {}
        
        # 1. Monthly unemployment trend
        if 'Date' in df.columns:
            trend_df = df.groupby('Date')['Unemployment_Rate'].mean().reset_index()
            fig = px.line(trend_df, x='Date', y='Unemployment_Rate')
            fig.update_layout(self._get_plotly_layout("Monthly Unemployment Trend"))
            plots['monthly_trend'] = pio.to_json(fig)
            
        # 2. State-wise unemployment bar chart
        state_df = df.groupby('Region')['Unemployment_Rate'].mean().reset_index().sort_values('Unemployment_Rate', ascending=False)
        fig = px.bar(state_df, x='Region', y='Unemployment_Rate')
        fig.update_layout(self._get_plotly_layout("State-wise Average Unemployment Rate"))
        plots['state_bar'] = pio.to_json(fig)
        
        # 3. Top 10 highest unemployment states
        fig = px.bar(state_df.head(10), x='Region', y='Unemployment_Rate', color_discrete_sequence=['#E74C3C'])
        fig.update_layout(self._get_plotly_layout("Top 10 Highest Unemployment States"))
        plots['top_10_high'] = pio.to_json(fig)
        
        # 4. Top 10 lowest unemployment states
        fig = px.bar(state_df.tail(10), x='Region', y='Unemployment_Rate', color_discrete_sequence=['#2ECC71'])
        fig.update_layout(self._get_plotly_layout("Top 10 Lowest Unemployment States"))
        plots['top_10_low'] = pio.to_json(fig)
        
        # 5. Labour participation rate
        part_df = df.groupby('Region')['Labour_Participation_Rate'].mean().reset_index().sort_values('Labour_Participation_Rate', ascending=False)
        fig = px.bar(part_df, x='Region', y='Labour_Participation_Rate', color_discrete_sequence=['#4A90E2'])
        fig.update_layout(self._get_plotly_layout("State-wise Labour Participation Rate"))
        plots['labour_part'] = pio.to_json(fig)
        
        # 6. Employment distribution
        emp_df = df.groupby('Region')['Employed'].sum().reset_index().sort_values('Employed', ascending=False)
        top15 = emp_df.head(15)
        fig = go.Figure(data=[
            go.Pie(
                labels=top15['Region'].tolist(),
                values=top15['Employed'].tolist(),
                hole=0.3,
                hovertemplate="<b>%{label}</b><br>Employment Total: %{value:,.0f}<br>Percentage Share: %{percent}<extra></extra>"
            )
        ])
        fig.update_layout(self._get_plotly_layout("Employment Distribution (Top 15 States)"))
        plots['employment_dist'] = pio.to_json(fig)
        
        # 7. Regional unemployment comparison
        # Check if we have Area or Region.1 (like North/South)
        region_col = 'Area' if 'Area' in df.columns else ('Region.1' if 'Region.1' in df.columns else None)
        if region_col:
            reg_df = df.groupby(region_col).agg(
                Unemployment_Rate=('Unemployment_Rate', 'mean'),
                Record_Count=(region_col, 'count')
            ).reset_index()
            fig = go.Figure(data=[
                go.Bar(
                    x=reg_df[region_col].tolist(),
                    y=reg_df['Unemployment_Rate'].tolist(),
                    marker_color=['#4A90E2', '#E74C3C', '#2ECC71', '#D4AF37'][:len(reg_df)],
                    text=[f"{v:.2f}%" for v in reg_df['Unemployment_Rate'].tolist()],
                    textposition='auto',
                    customdata=reg_df['Record_Count'].tolist(),
                    hovertemplate="<b>%{x}</b><br>Avg Unemployment: %{y:.2f}%<br>Record Count: %{customdata}<extra></extra>"
                )
            ])
            fig.update_layout(self._get_plotly_layout(f"Unemployment by {region_col}"))
            plots['regional_comp'] = pio.to_json(fig)
            
        # 8. COVID unemployment trend chart
        # Let's assume March 2020 is start of covid impact
        if 'Date' in df.columns:
            fig = px.scatter(df, x='Date', y='Unemployment_Rate', color='Region', opacity=0.6)
            fig.add_vline(x=pd.to_datetime('2020-03-24'), line_width=3, line_dash="dash", line_color="red", annotation_text="COVID Lockdown")
            fig.update_layout(self._get_plotly_layout("COVID Unemployment Scatter Trend"))
            plots['covid_trend'] = pio.to_json(fig)
            
        # 9. Monthly unemployment heatmap
        if 'Month' in df.columns and 'Year' in df.columns:
            pivot_df = df.pivot_table(values='Unemployment_Rate', index='Region', columns=['Year', 'Month'], aggfunc='mean')
            # Flatten columns for heatmap
            pivot_df.columns = [f"{y}-{m:02d}" for y, m in pivot_df.columns]
            pivot_df = pivot_df.fillna(0)
            fig = go.Figure(data=go.Heatmap(
                z=pivot_df.values.tolist(),
                x=pivot_df.columns.tolist(),
                y=pivot_df.index.tolist(),
                colorscale='YlOrRd',
                hovertemplate="State: %{y}<br>Month: %{x}<br>Unemployment: %{z:.2f}%<extra></extra>"
            ))
            fig.update_layout(self._get_plotly_layout("Monthly Unemployment Heatmap"))
            plots['heatmap'] = pio.to_json(fig)
            
        # 10. Correlation heatmap
        num_df = df[['Unemployment_Rate', 'Employed', 'Labour_Participation_Rate']].dropna().corr()
        z_vals = num_df.values.tolist()
        x_vals = num_df.columns.tolist()
        y_vals = num_df.index.tolist()
        text_vals = [[f"{val:.2f}" for val in row] for row in z_vals]
        fig = go.Figure(data=go.Heatmap(
            z=z_vals,
            x=x_vals,
            y=y_vals,
            text=text_vals,
            texttemplate="%{text}",
            colorscale='RdBu_r',
            hovertemplate="Variable A: %{x}<br>Variable B: %{y}<br>Correlation: %{z:.2f}<extra></extra>"
        ))
        fig.update_layout(self._get_plotly_layout("Correlation Heatmap"))
        plots['correlation'] = pio.to_json(fig)
        
        return plots

    def get_covid_impact(self):
        if self.df_clean is None or 'Date' not in self.df_clean.columns: return None
        df = self.df_clean
        
        lockdown_date = pd.to_datetime('2020-03-24')
        pre_covid = df[df['Date'] < lockdown_date]
        during_covid = df[df['Date'] >= lockdown_date]
        
        pre_mean = pre_covid['Unemployment_Rate'].mean()
        during_mean = during_covid['Unemployment_Rate'].mean()
        
        increase_pct = ((during_mean - pre_mean) / pre_mean * 100) if pre_mean > 0 else 0
        
        # State impact
        pre_state = pre_covid.groupby('Region')['Unemployment_Rate'].mean()
        during_state = during_covid.groupby('Region')['Unemployment_Rate'].mean()
        
        impact_df = pd.DataFrame({'Pre': pre_state, 'During': during_state}).dropna()
        impact_df['Increase'] = impact_df['During'] - impact_df['Pre']
        impact_df = impact_df.sort_values('Increase', ascending=False)
        
        most_affected = impact_df.index[0] if len(impact_df) > 0 else "N/A"
        least_affected = impact_df.index[-1] if len(impact_df) > 0 else "N/A"
        
        return {
            "pre_covid_avg": round(pre_mean, 2) if not pd.isna(pre_mean) else 0,
            "during_covid_avg": round(during_mean, 2) if not pd.isna(during_mean) else 0,
            "increase_pct": round(increase_pct, 2),
            "most_affected_state": most_affected,
            "least_affected_state": least_affected,
            "state_impact": impact_df.reset_index().to_dict(orient='records')
        }

    def generate_insights(self):
        if self.df_clean is None: return None
        df = self.df_clean
        
        state_avg = df.groupby('Region')['Unemployment_Rate'].mean().sort_values()
        
        highest_state = state_avg.index[-1]
        highest_rate = state_avg.iloc[-1]
        
        lowest_state = state_avg.index[0]
        lowest_rate = state_avg.iloc[0]
        
        overall_avg = df['Unemployment_Rate'].mean()
        
        part_avg = df['Labour_Participation_Rate'].mean()
        emp_sum = df['Employed'].sum()
        
        return {
            "highest_state": f"{highest_state} ({round(highest_rate, 2)}%)",
            "lowest_state": f"{lowest_state} ({round(lowest_rate, 2)}%)",
            "average_rate": f"{round(overall_avg, 2)}%",
            "labour_participation": f"The average labour participation rate across all regions is {round(part_avg, 2)}%.",
            "employment_obs": f"Total employment entries reflect significant variations across regions.",
            "general_insight": f"Data analysis reveals that {highest_state} faces the most severe unemployment challenges, while {lowest_state} remains relatively stable."
        }

    def generate_ai_executive_insights(self):
        if self.df_clean is None: return None
        df = self.df_clean
        
        # 1. State Analysis
        state_avg = df.groupby('Region')['Unemployment_Rate'].mean().sort_values()
        highest_state = state_avg.index[-1]
        highest_rate = state_avg.iloc[-1]
        lowest_state = state_avg.index[0]
        lowest_rate = state_avg.iloc[0]
        
        # 2. Trend & Seasonal Analysis
        trend_summary = "Stable"
        strongest_improvement = "N/A"
        strongest_decline = "N/A"
        
        if 'Date' in df.columns:
            monthly_trend = df.groupby('Date')['Unemployment_Rate'].mean().sort_index()
            if len(monthly_trend) > 1:
                diffs = monthly_trend.diff().dropna()
                max_increase_date = diffs.idxmax()
                max_decrease_date = diffs.idxmin()
                
                strongest_decline = f"{max_increase_date.strftime('%B %Y')} (+{diffs.max():.2f}%)"
                strongest_improvement = f"{max_decrease_date.strftime('%B %Y')} ({diffs.min():.2f}%)"
                
                overall_change = monthly_trend.iloc[-1] - monthly_trend.iloc[0]
                if overall_change > 1.5:
                    trend_summary = "Significant Upward Volatility"
                elif overall_change < -1.5:
                    trend_summary = "General Recovery / Downward Trend"
                else:
                    trend_summary = "Relatively Stagnant / Flat Trend"
        
        # 3. Statistical Anomalies
        mean_rate = df['Unemployment_Rate'].mean()
        std_rate = df['Unemployment_Rate'].std()
        anomalies = state_avg[state_avg > (mean_rate + 2*std_rate)]
        anomaly_text = f"Detected {len(anomalies)} severe outliers" if len(anomalies) > 0 else "No severe statistical outliers detected."
        
        # 4. Employment Stability
        emp_std = df.groupby('Region')['Employed'].std().mean()
        emp_mean = df.groupby('Region')['Employed'].mean().mean()
        stability = "High Volatility" if (emp_std / emp_mean) > 0.2 else "Stable Workforce"
        
        # 5. Executive Summary
        exec_summary = (f"The dataset reveals a {trend_summary.lower()} in overall unemployment dynamics. "
                        f"Regionally, {highest_state} represents the critical peak at {highest_rate:.2f}%, "
                        f"requiring immediate strategic intervention. Conversely, {lowest_state} maintains robust "
                        f"resilience at {lowest_rate:.2f}%. Labour markets demonstrate a '{stability.lower()}' profile overall.")
        
        # 6. Key Findings
        key_findings = [
            f"Peak Unemployment: {highest_state} recorded the highest average rate ({highest_rate:.2f}%).",
            f"Market Resilience: {lowest_state} maintained the lowest average rate ({lowest_rate:.2f}%).",
            f"Macro Trend: The national trajectory indicates {trend_summary.lower()}.",
            f"Volatility Peak: The sharpest market disruption occurred in {strongest_decline}.",
            f"Recovery Peak: The strongest market recovery was observed in {strongest_improvement}."
        ]
        
        # 7. Recommended Actions
        recommended_actions = [
            f"Deploy targeted economic relief funds immediately to {highest_state} to stabilize local markets.",
            f"Analyze the industrial framework of {lowest_state} to replicate its stability model nationally.",
            f"Prepare counter-cyclical buffers for periods resembling {strongest_decline.split(' ')[0]} to prevent future spikes."
        ]
        if len(anomalies) > 0:
            recommended_actions.append(f"Investigate the {len(anomalies)} regions breaching statistical norms for localized crises.")
        
        # 8. Confidence Indicator
        # High confidence for large datasets, penalize slightly for very small sets
        confidence = min(99, int((len(df) / 500) * 100)) if len(df) < 500 else 98
        
        return {
            "executive_summary": exec_summary,
            "key_findings": key_findings,
            "recommended_actions": recommended_actions,
            "confidence": confidence,
            "trend_summary": trend_summary,
            "stability": stability
        }

    def run_ai_simulation(self, sim_unemployment, sim_employed, sim_participation):
        """Runs the AI Scenario Simulator against the current dataset baseline."""
        if self.df_clean is None:
            return None
            
        df = self.df_clean
        
        # Calculate Current Baseline
        current_unemployment = df['Unemployment_Rate'].mean()
        current_employed = df['Employed'].mean()
        current_participation = df['Labour_Participation_Rate'].mean()
        
        # 1. Overall Risk Level
        if sim_unemployment < 5:
            risk_level = "Low Risk"
            risk_color = "success fw-bold-fix"
        elif sim_unemployment < 10:
            risk_level = "Moderate Risk"
            risk_color = "warning fw-bold-fix"
        elif sim_unemployment < 15:
            risk_level = "High Risk"
            risk_color = "danger fw-bold-fix"
        else:
            risk_level = "Critical Risk"
            risk_color = "critical"
            
        # 2. AI Interpretation
        interpretation = (f"The simulated scenario projects an unemployment rate of {sim_unemployment}%. ")
        
        if sim_unemployment > current_unemployment:
            interpretation += f"This represents a worsening condition compared to the baseline ({current_unemployment:.2f}%). "
        else:
            interpretation += f"This indicates an improvement from the baseline ({current_unemployment:.2f}%). "
            
        if sim_participation >= current_participation:
            interpretation += "Labour participation remains healthy, suggesting the workforce is actively engaged."
        else:
            interpretation += "A drop in labour participation suggests systemic discouragement in the workforce."
            
        # 3. Policy Recommendation Engine
        recommendations = []
        if sim_unemployment >= 15:
            recommendations.append("Implement immediate crisis-level emergency relief funds.")
            recommendations.append("Launch aggressive public infrastructure programs to generate mass employment.")
        elif sim_unemployment >= 10:
            recommendations.append("Increase MSME support and subsidize industrial investments.")
            recommendations.append("Initiate targeted rural employment strategies.")
        elif sim_unemployment >= 5:
            recommendations.append("Focus on localized skill development and vocational training.")
            recommendations.append("Incentivize corporate hiring through tax benefits.")
        else:
            recommendations.append("Maintain current economic policies; market is highly stable.")
            recommendations.append("Shift focus towards high-tech industrial growth and quality of life improvements.")
            
        if sim_participation < current_participation:
            recommendations.append("Investigate barriers to entry causing workforce discouragement (e.g., lack of childcare, poor wages).")
            
        # 4. Confidence Indicator
        confidence = 96 if sim_unemployment <= 30 else 82 # slightly lower confidence for extreme outliers
        
        # 5. Scenario Summary
        summary = {
            "scenario_type": "Stress Test" if sim_unemployment > current_unemployment else "Growth Projection",
            "estimated_risk": risk_level,
            "employment_outlook": "Negative" if sim_unemployment > current_unemployment else "Positive",
            "economic_stability": "Volatile" if sim_unemployment > 15 else "Stable",
            "suggested_priority": "Intervention" if sim_unemployment >= 10 else "Monitoring"
        }
        
        # 6. Smart Comparison
        comparison = {
            "unemployment": {
                "current": float(round(current_unemployment, 2)),
                "simulated": float(round(sim_unemployment, 2)),
                "diff": float(round(sim_unemployment - current_unemployment, 2)),
                "worsened": bool(sim_unemployment > current_unemployment)
            },
            "employed": {
                "current": float(round(current_employed, 2)),
                "simulated": float(round(sim_employed, 2)),
                "diff": float(round(sim_employed - current_employed, 2)),
                "worsened": bool(sim_employed < current_employed)
            },
            "participation": {
                "current": float(round(current_participation, 2)),
                "simulated": float(round(sim_participation, 2)),
                "diff": float(round(sim_participation - current_participation, 2)),
                "worsened": bool(sim_participation < current_participation)
            }
        }
        
        return {
            "risk_level": risk_level,
            "risk_color": risk_color,
            "ai_interpretation": interpretation,
            "recommendations": recommendations,
            "confidence": confidence,
            "summary": summary,
            "comparison": comparison
        }

    def generate_state_rankings(self):
        """Generates AI State Performance Rankings and Insights"""
        if self.df_clean is None:
            return None
            
        df = self.df_clean
        
        # Group by Region
        state_stats = df.groupby('Region').agg({
            'Unemployment_Rate': 'mean',
            'Employed': 'mean',
            'Labour_Participation_Rate': 'mean'
        }).reset_index()
        
        # Calculate AI Performance Score
        # Normalize variables (0 to 1)
        max_unemp = state_stats['Unemployment_Rate'].max()
        min_unemp = state_stats['Unemployment_Rate'].min()
        
        max_part = state_stats['Labour_Participation_Rate'].max()
        min_part = state_stats['Labour_Participation_Rate'].min()
        
        rankings = []
        for index, row in state_stats.iterrows():
            unemp = row['Unemployment_Rate']
            emp = row['Employed']
            part = row['Labour_Participation_Rate']
            
            # Lower unemployment is better (inversely proportional)
            unemp_score = 100 - (((unemp - min_unemp) / (max_unemp - min_unemp + 0.001)) * 100)
            
            # Higher participation is better
            part_score = ((part - min_part) / (max_part - min_part + 0.001)) * 100
            
            # Combined AI Score (Weighted 60% Unemployment, 40% Participation)
            ai_score = (unemp_score * 0.6) + (part_score * 0.4)
            
            # Assign Status
            if ai_score >= 80:
                status = "Excellent"
                status_color = "success"
            elif ai_score >= 60:
                status = "Good"
                status_color = "primary"
            elif ai_score >= 40:
                status = "Average"
                status_color = "warning"
            elif ai_score >= 20:
                status = "Needs Attention"
                status_color = "orange" # We will use a custom class for this
            else:
                status = "Critical"
                status_color = "danger"
                
            rankings.append({
                "state": row['Region'],
                "unemployment": float(round(unemp, 2)),
                "employed": float(round(emp, 2)),
                "participation": float(round(part, 2)),
                "ai_score": float(round(ai_score, 1)),
                "status": status,
                "status_color": status_color
            })
            
        # Sort by AI Score descending
        rankings = sorted(rankings, key=lambda x: x['ai_score'], reverse=True)
        
        # Add Rank
        for i, rank in enumerate(rankings):
            rank['rank'] = i + 1
            
        # Top 5 Best and Worst
        top_5_best = rankings[:5]
        top_5_worst = rankings[-5:]
        
        # AI Insights
        highest_improvement_state = "N/A" # Usually derived from temporal data, but let's just highlight the #1 state for now
        best_state = top_5_best[0]['state']
        highest_unemp_state = max(rankings, key=lambda x: x['unemployment'])['state']
        highest_unemp_rate = max(rankings, key=lambda x: x['unemployment'])['unemployment']
        best_part_state = max(rankings, key=lambda x: x['participation'])['state']
        urgent_intervention_state = top_5_worst[-1]['state']
        
        insights = {
            "top_performer": f"{best_state} achieved the highest AI performance score ({top_5_best[0]['ai_score']}/100).",
            "highest_unemployment": f"{highest_unemp_state} recorded the highest average unemployment rate at {highest_unemp_rate}%.",
            "healthiest_participation": f"{best_part_state} maintains the most active workforce participation.",
            "urgent_intervention": f"{urgent_intervention_state} requires immediate policy intervention due to critical scoring."
        }
        
        return {
            "leaderboard": rankings,
            "top_5_best": top_5_best,
            "top_5_worst": top_5_worst[::-1], # Reverse so the absolute worst is first
            "insights": insights
        }

    def generate_early_warning_data(self):
        """Generates AI Early Warning & Hotspot Prediction Data"""
        if self.df_clean is None:
            return None
            
        df = self.df_clean
        
        # 1. Calculate baselines
        state_stats = df.groupby('Region').agg(
            mean_unemp=('Unemployment_Rate', 'mean'),
            max_unemp=('Unemployment_Rate', 'max'),
            mean_part=('Labour_Participation_Rate', 'mean')
        ).reset_index()
        
        national_mean = df['Unemployment_Rate'].mean()
        national_std = df['Unemployment_Rate'].std()
        
        warnings = []
        for index, row in state_stats.iterrows():
            state = row['Region']
            unemp = row['mean_unemp']
            max_u = row['max_unemp']
            
            # Classification Logic
            if unemp > (national_mean + 1.5 * national_std) or max_u > 25:
                level = "Red"
                category = "Critical Intervention"
                color_class = "danger"
            elif unemp > (national_mean + 0.5 * national_std):
                level = "Orange"
                category = "High-Risk"
                color_class = "warning" # Ensure we handle text color in UI
            elif unemp > (national_mean - 0.5 * national_std):
                level = "Yellow"
                category = "Emerging Concern"
                color_class = "info"
            else:
                level = "Green"
                category = "Stable"
                color_class = "success"
                
            warnings.append({
                "state": state,
                "unemployment": float(round(unemp, 2)),
                "max_unemployment": float(round(max_u, 2)),
                "level": level,
                "category": category,
                "color_class": color_class
            })
            
        # 2. Risk Category Distribution
        distribution = {
            "Green": sum(1 for w in warnings if w['level'] == 'Green'),
            "Yellow": sum(1 for w in warnings if w['level'] == 'Yellow'),
            "Orange": sum(1 for w in warnings if w['level'] == 'Orange'),
            "Red": sum(1 for w in warnings if w['level'] == 'Red')
        }
        
        # 3. Top 5 High Priority States
        warnings_sorted = sorted(warnings, key=lambda x: x['unemployment'], reverse=True)
        top_5_priority = warnings_sorted[:5]
        
        # 4. Overall National Risk Indicator & Confidence
        red_orange_pct = (distribution['Red'] + distribution['Orange']) / len(warnings) * 100
        if red_orange_pct > 30:
            national_risk = "Severe Alert"
            risk_color = "danger"
        elif red_orange_pct > 15:
            national_risk = "Elevated Risk"
            risk_color = "warning"
        else:
            national_risk = "Stable Outlook"
            risk_color = "success"
            
        confidence = 94 if len(df) > 100 else 81
        
        # 5. AI Explanation
        critical_count = distribution['Red']
        high_risk_count = distribution['Orange']
        explanation = f"Analysis reveals {critical_count} region(s) requiring critical intervention, and {high_risk_count} region(s) showing high-risk patterns. The national baseline sits at {national_mean:.2f}%. Regions deviating significantly from this baseline have been flagged for immediate review."
        
        # 6. Preventive Recommendations
        recommendations = [
            "Initiate rapid economic assessments for all regions in the 'Critical Intervention' tier.",
            "Allocate emergency unemployment funds proportionally based on the Hotspot Priority Queue.",
            "Monitor 'Emerging Concern' regions closely to prevent transition into higher risk tiers.",
            "Cross-reference stable regions' industrial policies to extract structural resilience models."
        ]
        
        return {
            "distribution": distribution,
            "top_5_priority": top_5_priority,
            "national_risk": national_risk,
            "national_risk_color": risk_color,
            "confidence": confidence,
            "explanation": explanation,
            "recommendations": recommendations,
            "all_warnings": warnings_sorted
        }

    def generate_policy_decision_lab_data(self):
        """Generates AI Policy Impact Simulator & Decision Lab Data"""
        if self.df_clean is None:
            return None
            
        df = self.df_clean
        
        # Current Baselines
        current_unemployment = df['Unemployment_Rate'].mean()
        current_employed = df['Employed'].sum() if df['Employed'].sum() > 0 else df['Employed'].mean()
        
        policies = [
            {
                "id": "policy_skill",
                "name": "National Skill Development Program",
                "unemp_modifier": -1.2,
                "emp_modifier": 0.05,
                "investment": "$2.5 Billion",
                "timeline": "18-24 Months",
                "priority": "High",
                "explanation": {
                    "why": "Bridging the skill gap directly targets structural unemployment, especially in transitioning economies.",
                    "benefits": "Increases employability of youth and transitions workers from informal to formal sectors.",
                    "limitations": "Requires significant upfront capital and time to yield measurable results.",
                    "long_term": "Creates a highly resilient workforce immune to automation shocks.",
                    "recommendation": "Strongly recommended as a foundational long-term strategy."
                },
                "strategic": {
                    "immediate": "Identify key industries facing skill shortages.",
                    "short_term": "Partner with private sector for vocational training.",
                    "long_term": "Integrate skill modules into standard education curriculum.",
                    "budget": "Allocate 40% to tech-skills, 60% to manufacturing/services.",
                    "workforce": "Focus heavily on youth and rural demographics."
                }
            },
            {
                "id": "policy_msme",
                "name": "MSME Financial Support",
                "unemp_modifier": -2.5,
                "emp_modifier": 0.08,
                "investment": "$5.0 Billion",
                "timeline": "6-12 Months",
                "priority": "Critical",
                "explanation": {
                    "why": "Micro, Small and Medium Enterprises (MSMEs) are the largest employment generators.",
                    "benefits": "Provides immediate liquidity, preventing mass layoffs and encouraging rapid hiring.",
                    "limitations": "Risk of non-performing assets (NPAs) if funds are mismanaged.",
                    "long_term": "Stabilizes the core economic engine and promotes grassroots entrepreneurship.",
                    "recommendation": "Critical for immediate crisis management and rapid recovery."
                },
                "strategic": {
                    "immediate": "Disburse collateral-free loans to distressed sectors.",
                    "short_term": "Subsidize interest rates for job-creating enterprises.",
                    "long_term": "Digitize MSME compliance to reduce overheads.",
                    "budget": "Heavy focus on credit guarantee schemes.",
                    "workforce": "Sustains current employment; minimal new upskilling required."
                }
            },
            {
                "id": "policy_infra",
                "name": "Infrastructure Investment",
                "unemp_modifier": -1.8,
                "emp_modifier": 0.07,
                "investment": "$10.0 Billion",
                "timeline": "36-48 Months",
                "priority": "Medium",
                "explanation": {
                    "why": "Large scale infrastructure projects absorb massive amounts of unskilled and semi-skilled labor.",
                    "benefits": "Creates direct construction jobs and indirect supply-chain jobs while building national assets.",
                    "limitations": "Very high capital requirement and slow implementation speed.",
                    "long_term": "Improves overall economic efficiency and logistics.",
                    "recommendation": "Recommended for sustained, multi-year economic growth."
                },
                "strategic": {
                    "immediate": "Fast-track approvals for pending mega-projects.",
                    "short_term": "Mobilize rural labor forces towards construction hubs.",
                    "long_term": "Develop smart cities and industrial corridors.",
                    "budget": "Phased allocation tied to project milestones.",
                    "workforce": "High absorption of blue-collar workers."
                }
            },
            {
                "id": "policy_rural",
                "name": "Rural Employment Mission",
                "unemp_modifier": -1.5,
                "emp_modifier": 0.06,
                "investment": "$3.0 Billion",
                "timeline": "12-18 Months",
                "priority": "High",
                "explanation": {
                    "why": "Rural areas often face disguised unemployment and seasonal joblessness.",
                    "benefits": "Prevents distress migration to urban centers and boosts rural demand.",
                    "limitations": "May create dependency on government subsidies if not linked to asset creation.",
                    "long_term": "Strengthens agrarian resilience and rural infrastructure.",
                    "recommendation": "Highly recommended for balanced regional development."
                },
                "strategic": {
                    "immediate": "Expand guaranteed wage employment days.",
                    "short_term": "Link rural work to agriculture and water conservation.",
                    "long_term": "Develop rural agro-processing hubs.",
                    "budget": "Direct benefit transfers to worker accounts.",
                    "workforce": "Focus on seasonal and agricultural workers."
                }
            },
            {
                "id": "policy_women",
                "name": "Women Workforce Initiative",
                "unemp_modifier": -0.8,
                "emp_modifier": 0.04,
                "investment": "$1.5 Billion",
                "timeline": "24-36 Months",
                "priority": "Medium",
                "explanation": {
                    "why": "Female labor participation is historically lower; increasing it directly boosts GDP.",
                    "benefits": "Promotes gender parity and unlocks a massive untapped talent pool.",
                    "limitations": "Deeply entrenched social norms take time to shift.",
                    "long_term": "Creates a dual-income economy, exponentially increasing household spending.",
                    "recommendation": "Essential for modernizing the national workforce demographics."
                },
                "strategic": {
                    "immediate": "Mandate safe transport and workplace childcare.",
                    "short_term": "Provide tax incentives for companies with high female hiring.",
                    "long_term": "Promote STEM education for girls.",
                    "budget": "Subsidize maternity benefits for small employers.",
                    "workforce": "Brings non-participating demographics into the labor pool."
                }
            },
            {
                "id": "policy_startup",
                "name": "Startup Incentive Program",
                "unemp_modifier": -0.5,
                "emp_modifier": 0.02,
                "investment": "$1.0 Billion",
                "timeline": "12-24 Months",
                "priority": "Low",
                "explanation": {
                    "why": "Innovation drives future economies and creates high-value jobs.",
                    "benefits": "Retains top talent and fosters rapid technological advancement.",
                    "limitations": "High failure rate of startups; primarily creates urban, white-collar jobs.",
                    "long_term": "Positions the nation as a global innovation hub.",
                    "recommendation": "Good for targeted high-tech growth, but low impact on mass unemployment."
                },
                "strategic": {
                    "immediate": "Provide tax holidays for recognized startups.",
                    "short_term": "Establish state-backed venture capital funds.",
                    "long_term": "Build world-class incubation centers.",
                    "budget": "Equity matching and R&D grants.",
                    "workforce": "Focuses on highly skilled, specialized labor."
                }
            },
            {
                "id": "policy_mfg",
                "name": "Manufacturing Expansion Policy",
                "unemp_modifier": -2.0,
                "emp_modifier": 0.07,
                "investment": "$8.0 Billion",
                "timeline": "24-48 Months",
                "priority": "High",
                "explanation": {
                    "why": "Manufacturing has the highest multiplier effect on job creation.",
                    "benefits": "Reduces import dependency and absorbs massive amounts of semi-skilled labor.",
                    "limitations": "Requires overhaul of labor laws and logistics infrastructure.",
                    "long_term": "Transitions economy from agrarian/services dependency to industrial strength.",
                    "recommendation": "Highly recommended for structural economic transformation."
                },
                "strategic": {
                    "immediate": "Announce production-linked incentive (PLI) schemes.",
                    "short_term": "Streamline labor compliance and land acquisition.",
                    "long_term": "Develop global export manufacturing zones.",
                    "budget": "Heavy incentives tied to output milestones.",
                    "workforce": "Massive absorption of semi-skilled labor."
                }
            },
            {
                "id": "policy_digital",
                "name": "Digital Employment Initiative",
                "unemp_modifier": -0.9,
                "emp_modifier": 0.03,
                "investment": "$2.0 Billion",
                "timeline": "12-24 Months",
                "priority": "Medium",
                "explanation": {
                    "why": "The gig economy and remote work are rapidly expanding sectors.",
                    "benefits": "Decentralizes employment, allowing rural youth to work for global companies.",
                    "limitations": "Requires reliable internet and digital literacy.",
                    "long_term": "Integrates the remote workforce into the formal digital economy.",
                    "recommendation": "Recommended as a modern supplement to traditional job creation."
                },
                "strategic": {
                    "immediate": "Subsidize broadband in tier-2 and tier-3 cities.",
                    "short_term": "Provide free digital literacy and coding bootcamps.",
                    "long_term": "Establish legal frameworks for gig worker protections.",
                    "budget": "Investment in digital infrastructure and training platforms.",
                    "workforce": "Empowers youth and remote workers."
                }
            }
        ]
        
        # Calculate impacts dynamically based on dataset
        for p in policies:
            # Scale modifier based on current severity (worse unemployment = higher potential impact)
            severity_multiplier = min(1.5, max(0.5, current_unemployment / 8.0)) 
            
            p['est_unemp_reduction'] = round(p['unemp_modifier'] * severity_multiplier, 2)
            
            # Employment growth relative to total employed in dataset
            growth_raw = current_employed * p['emp_modifier'] * severity_multiplier
            if growth_raw > 1000000:
                p['est_emp_growth'] = f"+{(growth_raw / 1000000):.2f}M Jobs"
            else:
                p['est_emp_growth'] = f"+{int(growth_raw):,} Jobs"
                
            # AI Impact Score (0-100)
            score = min(99, max(45, (abs(p['est_unemp_reduction']) * 20) + (p['emp_modifier'] * 400)))
            if p['priority'] == "Critical": score += 10
            if p['priority'] == "High": score += 5
            
            p['ai_impact_score'] = round(score, 1)
            
            # Policy-specific AI confidence (75-99%)
            base_conf = 85 + (min(500, len(df)) / 100)
            variance_penalty = abs(p['est_unemp_reduction']) * 0.5
            priority_bonus = 2 if p['priority'] in ["Low", "Medium"] else 0
            
            p['ai_confidence'] = round(min(99, max(75, base_conf - variance_penalty + priority_bonus)), 1)
            
        # Sort policies for Comparative Ranking
        ranked_policies = sorted(policies, key=lambda x: x['ai_impact_score'], reverse=True)
        
        # Add rank
        for i, p in enumerate(ranked_policies):
            p['rank'] = i + 1
            
        return {
            "policies": ranked_policies,
            "baseline_unemployment": round(current_unemployment, 2)
        }

    def generate_command_center_data(self):
        """Generates the master payload for the AI Executive Command Center"""
        if self.df_clean is None:
            return None
            
        df = self.df_clean
        
        # Gather data from other modules
        eda_stats = self.get_eda_stats()
        cleaning = self.get_cleaning_summary()
        covid = self.get_covid_impact()
        insights = self.generate_insights()
        ai_insights = self.generate_ai_executive_insights()
        rankings = self.generate_state_rankings()
        early_warning = self.generate_early_warning_data()
        policy_lab = self.generate_policy_decision_lab_data()

        # 1. Executive KPI Header
        total_states = df['Region'].nunique() if 'Region' in df.columns else 0
        dataset_quality = "Excellent" if cleaning['missing_values'] == 0 else "Good" if cleaning['missing_values'] < 100 else "Fair"
        national_risk_level = early_warning['national_risk'] if early_warning else "Unknown"
        ai_confidence = early_warning['confidence'] if early_warning else 90
        
        overall_health_score = 0
        if rankings and rankings['leaderboard']:
            overall_health_score = sum(r['ai_score'] for r in rankings['leaderboard']) / len(rankings['leaderboard'])

        kpi_header = {
            "health_score": round(overall_health_score, 1),
            "dataset_quality": dataset_quality,
            "ai_confidence": ai_confidence,
            "national_risk": national_risk_level,
            "total_states": total_states,
            "active_dataset": self.filename or "Loaded Dataset"
        }

        # 2. Executive Intelligence Summary
        best_state = rankings['top_5_best'][0]['state'] if rankings and rankings['top_5_best'] else "N/A"
        critical_state = rankings['top_5_worst'][0]['state'] if rankings and rankings['top_5_worst'] else "N/A"
        trend_summary = ai_insights['trend_summary'] if ai_insights else "Stable"
        
        intel_summary = {
            "current_situation": f"The national unemployment trajectory is currently classified as '{trend_summary}'.",
            "strongest_findings": f"Overall average unemployment sits at {eda_stats['mean_unemployment']}%, with participation at {eda_stats['mean_participation']}%.",
            "highest_concerns": f"Significant statistical anomalies detected in {early_warning['distribution']['Red']} region(s).",
            "best_region": best_state,
            "critical_region": critical_state,
            "overall_recommendation": "Deploy targeted interventions to critical hotspots while studying the resilient structures of the best performing regions."
        }

        # 3. Cross-Module Intelligence Summary
        cross_module = {
            "dataset": f"Dataset '{self.filename}' loaded and validated successfully with {eda_stats['dataset_length']} records.",
            "cleaning": f"Cleaning pipeline executed: Address missing values and duplicate rows effectively.",
            "eda": f"Average unemployment stands at {eda_stats['mean_unemployment']}%, reflecting macro market trends.",
            "viz": f"Generated complete visual matrices of {total_states} regions.",
            "covid": f"COVID-19 impact detected a {covid['increase_pct']}% surge in joblessness." if covid and 'increase_pct' in covid else "COVID-19 temporal data not available for this set.",
            "insight": f"{insights['highest_state']} flagged as the most severely affected.",
            "scenario": f"Baseline simulation indicates a {ai_insights['stability']} workforce profile.",
            "ranking": f"{best_state} currently ranks highest in AI performance.",
            "early_warning": f"{early_warning['distribution']['Red']} critical hotspots detected requiring immediate intervention.",
            "policy": f"'{policy_lab['policies'][0]['name']}' identified as the highest impact strategic policy.",
            "report": "Full executive statistical report generated and ready for export."
        }

        # 4. AI Decision Priority Panel
        priority_panel = []
        if early_warning and 'all_warnings' in early_warning:
            for w in early_warning['all_warnings']:
                if w['level'] == 'Red':
                    priority_panel.append({"state": w['state'], "priority": "Immediate", "badge": "danger", "reason": "Severe unemployment deviation", "action": "Implement crisis-level emergency relief."})
                elif w['level'] == 'Orange':
                    priority_panel.append({"state": w['state'], "priority": "High Priority", "badge": "warning", "reason": "Elevated unemployment risk", "action": "Increase MSME support and localized investments."})
                elif w['level'] == 'Yellow':
                    priority_panel.append({"state": w['state'], "priority": "Monitor", "badge": "info", "reason": "Emerging negative trend", "action": "Closely monitor leading economic indicators."})
                elif w['level'] == 'Green':
                    priority_panel.append({"state": w['state'], "priority": "Stable", "badge": "success", "reason": "Within healthy baseline", "action": "Maintain current economic policies."})
        # Limit to top 15 to avoid clutter
        priority_panel = priority_panel[:15]

        # 5. Executive Achievement Panel
        state_stats = df.groupby('Region').agg({'Employed': 'sum', 'Unemployment_Rate': 'mean', 'Labour_Participation_Rate': 'mean'}).reset_index()
        highest_emp_state = state_stats.loc[state_stats['Employed'].idxmax()]['Region']
        lowest_unemp_state = state_stats.loc[state_stats['Unemployment_Rate'].idxmin()]['Region']
        highest_part_state = state_stats.loc[state_stats['Labour_Participation_Rate'].idxmax()]['Region']
        
        achievement_panel = {
            "best_performing": best_state,
            "highest_employment": highest_emp_state,
            "lowest_unemployment": lowest_unemp_state,
            "highest_participation": highest_part_state,
            "highest_ai_score": f"{round(rankings['top_5_best'][0]['ai_score'], 1)} ({best_state})",
            "most_critical": critical_state
        }

        # 6. Executive Readiness Meter
        # Calculate a readiness score out of 100
        # Formula: (Health Score * 0.6) + (AI Confidence * 0.4) - (Red Zones * 2)
        readiness_score = (overall_health_score * 0.6) + (ai_confidence * 0.4) - (early_warning['distribution']['Red'] * 2)
        readiness_score = max(0, min(100, readiness_score))
        
        if readiness_score >= 80:
            readiness_level = "Excellent"
            readiness_color = "#2ECC71"
        elif readiness_score >= 65:
            readiness_level = "Good"
            readiness_color = "#4A90E2"
        elif readiness_score >= 50:
            readiness_level = "Moderate"
            readiness_color = "#F1C40F"
        elif readiness_score >= 35:
            readiness_level = "Needs Attention"
            readiness_color = "#E67E22"
        else:
            readiness_level = "Critical"
            readiness_color = "#E74C3C"

        # 7. Final AI Recommendation
        final_recommendation = (
            f"The national status reflects a {trend_summary.lower()} condition, with an average unemployment rate of {eda_stats['mean_unemployment']}%. "
            f"The primary risks involve {early_warning['distribution']['Red']} states flagged for critical intervention, specifically led by {critical_state}. "
            f"Conversely, structural strengths are evident in {best_state} and {highest_emp_state}, demonstrating resilient employment profiles. "
            f"Suggested government priorities must focus on '{policy_lab['policies'][0]['name']}' to immediately mitigate localized distress. "
            f"Expected outcome: Targeted resource deployment to high-risk zones while applying best-state practices will stabilize the national baseline."
        )

        return {
            "kpi_header": kpi_header,
            "intel_summary": intel_summary,
            "cross_module": cross_module,
            "priority_panel": priority_panel,
            "achievement_panel": achievement_panel,
            "readiness_meter": {
                "score": round(readiness_score, 1),
                "level": readiness_level,
                "color": readiness_color
            },
            "final_recommendation": final_recommendation
        }



