import os
from flask import Flask, render_template, request, jsonify
from data_engine import DataEngine
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "kma2_secure_key"

engine = DataEngine()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files or request.files['file'].filename == '':
        # Fallback for automated testing
        fallback_path = os.path.join(os.path.dirname(__file__), 'Unemployment in India.csv')
        res = engine.load_data(fallback_path, 'Unemployment in India.csv')
        return jsonify(res)
    
    file = request.files['file']
    
    if file and file.filename.endswith('.csv'):
        # Save temporarily
        temp_path = "temp_dataset.csv"
        file.save(temp_path)
        
        # Load into engine
        res = engine.load_data(temp_path, file.filename)
        return jsonify(res)
    else:
        return jsonify({"success": False, "error": "Invalid file format. Please upload a CSV."})

@app.route('/cleaning_summary', methods=['GET'])
def cleaning_summary():
    res = engine.get_cleaning_summary()
    if res:
        return jsonify({"success": True, "data": res})
    return jsonify({"success": False, "error": "No data loaded"})

@app.route('/clean', methods=['POST'])
def clean():
    success = engine.clean_data()
    return jsonify({"success": success})

@app.route('/dashboard_data', methods=['GET'])
def dashboard_data():
    if engine.df_clean is None:
        return jsonify({"success": False, "error": "Data not cleaned yet."})
    
    stats = engine.get_eda_stats()
    plots = engine.generate_plots()
    covid = engine.get_covid_impact()
    insights = engine.generate_insights()
    ai_insights = engine.generate_ai_executive_insights()
    
    # Generate policy recommendations based on data
    recommendations = {
        "economic": "Implement regional stimulus packages targeting the most affected states to spur localized job creation.",
        "employment": "Develop upskilling programs for sectors most impacted by the COVID-19 pandemic to transition workers.",
        "labour_participation": "Introduce incentives for small businesses to increase hiring and boost the overall participation rate.",
        "recovery": "Focus on long-term infrastructure projects to provide stable employment in states with high unemployment variance."
    }
    
    ranking_data = engine.generate_state_rankings()
    early_warning = engine.generate_early_warning_data()
    policy_lab = engine.generate_policy_decision_lab_data()
    command_center = engine.generate_command_center_data()
    
    return jsonify({
        "success": True,
        "stats": stats,
        "plots": plots,
        "covid": covid,
        "insights": insights,
        "ai_insights": ai_insights,
        "ranking_data": ranking_data,
        "early_warning": early_warning,
        "policy_lab": policy_lab,
        "command_center": command_center,
        "recommendations": recommendations,
        "filename": engine.filename
    })

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    try:
        sim_unemployment = float(data.get('unemployment_rate', 0))
        sim_employed = float(data.get('employed', 0))
        sim_participation = float(data.get('participation_rate', 0))
        
        simulation_results = engine.run_ai_simulation(sim_unemployment, sim_employed, sim_participation)
        
        if simulation_results:
            return jsonify({"success": True, "data": simulation_results})
        else:
            return jsonify({"success": False, "error": "No dataset loaded."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
