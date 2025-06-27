import React, { useState, useEffect } from 'react';

function App() {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState(['']);
  const [suggestions, setSuggestions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [fileSummary, setFileSummary] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('plan'));
    if (saved) {
      setTitle(saved.title || '');
      setSteps(Array.isArray(saved.steps) ? saved.steps : ['']);
    }
    fetchPlans();
  }, []);


  const fetchPlans = async () => {
    try {
      const res = await fetch('http://localhost:8080/plans');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load past plans:', err);
    }
  };

  const handleChangeStep = (index, value) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = value;
    setSteps(updatedSteps);
  };

  const addStep = () => setSteps([...steps, '']);

  const resetForm = () => {
    setTitle('');
    setSteps(['']);
    setSuggestions([]);
    setError('');
  };

  const loadExample = () => {
    setTitle("Launch a YouTube Channel");
    setSteps([
      "Pick a niche",
      "Buy a webcam and mic",
      "Plan first 3 videos",
      "Edit using CapCut",
      "Upload weekly"
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuggestions([]);
    setError('');
    setLoading(true);

    const cleanedSteps = steps.map(s => s.trim()).filter(s => s !== '');

    try {
      const res = await fetch('http://localhost:8080/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), steps: cleanedSteps }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unknown error from server.');
        setLoading(false);
        return;
      }

      const parsedSuggestions = data.suggestions
        .split(/\n?\d+\.\s+/)
        .filter(s => s.trim() !== '');

      setSuggestions(parsedSuggestions);
      fetchPlans();
    } catch (err) {
      setError('❌ Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFileSummary(data.error || 'Upload failed.');
        return;
      }

      let parsed = [];

      if (typeof data.suggestions === 'string') {
        parsed = data.suggestions
          .split(/\n?\d+\.\s+/)
          .filter(s => s.trim() !== '');
      } else if (Array.isArray(data.suggestions)) {
        parsed = data.suggestions;
      } else {
        throw new Error('Unexpected format for suggestions');
      }      
      setSuggestions(parsed);
      setFileSummary('✅ File analyzed successfully.');
      fetchPlans();
    } catch (err) {
      setFileSummary('❌ Upload error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: 700, margin: 'auto' }}>
      <h1>🧠 PlanWise is alive</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label><strong>Goal:</strong></label><br />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', marginBottom: 20, padding: '0.5rem' }}
            placeholder="e.g. Launch a Podcast"
            required
          />
        </div>

        <div>
          <label><strong>Tasks:</strong></label>
          {steps.map((step, i) => (
            <input
              key={i}
              value={step}
              onChange={(e) => handleChangeStep(i, e.target.value)}
              style={{ width: '100%', marginBottom: 10, padding: '0.5rem' }}
              placeholder={`Task ${i + 1}`}
              required
            />
          ))}
          <button type="button" onClick={addStep} style={{ marginBottom: 20 }}>+ Add Task</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>Analyze Plan</button>
          <button type="button" onClick={resetForm} style={{ padding: '0.5rem 1rem', backgroundColor: '#e11d48', color: 'white', border: 'none', cursor: 'pointer' }}>Clear</button>
          <button type="button" onClick={loadExample} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}>Try Example</button>
        </div>
      </form>

      <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #ccc' }}>
        <h2>📄 Upload a Document</h2>
        <input
          type="file"
          accept=".txt,.pdf"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: '1rem' }}
        />
        <button
          type="button"
          onClick={handleFileUpload}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            marginLeft: '1rem'
          }}
        >
          Upload & Analyze
        </button>
        {fileSummary && <p style={{ marginTop: 10 }}>{fileSummary}</p>}
      </div>

      {loading && <p style={{ color: '#666' }}>Analyzing plan... ⏳</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {Array.isArray(suggestions) && suggestions.length > 0 && (
  <div style={{ marginTop: 30 }}>
    <h2>Suggestions:</h2>
    <ul style={{ display: 'grid', gap: '1rem', listStyle: 'none', padding: 0 }}>
      {suggestions.map((s, i) => (
        <li key={i} style={{
          background: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #4f46e5'
        }}>
          {s}
        </li>
      ))}
    </ul>
  </div>
)}

{Array.isArray(plans) && plans.length > 0 && (
  <div style={{ marginTop: 40 }}>
    <h2>📚 Past Plans</h2>
    <ul style={{ paddingLeft: 20 }}>
      {plans.map((plan, i) => (
        <li key={i} style={{ marginBottom: 10 }}>
          <strong>{plan.goal}</strong>
          <ul>
            {(typeof plan.tasks === 'string' ? plan.tasks.split('\n') : []).map((task, j) => (
              <li key={j}>{task}</li>
            ))}
          </ul>
          <em>{typeof plan.feedback === 'string' ? plan.feedback.slice(0, 200) + '...' : ''}</em>
        </li>
      ))}
    </ul>
  </div>
)}
    </div>
  );
}

export default App;
