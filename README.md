# 📘 WiFi Mesh Performance Dashboard

Live link: [https://wifi-performance-dashboard.onrender.com/](https://wifi-performance-dashboard.onrender.com/)

Interactive web dashboard for comparing **WiFi mesh vs non-mesh performance** using pre-stored CSV datasets.

---


# Features

* Interactive multi-chart dashboard
* Mesh vs non-mesh comparison
* Performance vs distance analysis
* Consistency & reliability insights (CDF)
* Automatic router ranking
* No frontend framework required

---

# Tech Stack

* **Backend:** FastAPI
* **Frontend:** HTML + Vanilla JS
* **Charts:** Plotly.js
* **Data:** CSV (pre-stored)

---

# Project Structure

```bash
wifi_dashboard/
│
├── api/
│   ├── main.py
│   └── data_loader.py
│
├── data/
│   ├── throughput/
│   └── signal_strength/
│
├── static/
│   ├── dashboard.html
│   ├── dashboard.js
│
├── assets/                # screenshots
├── requirements.txt
└── README.md
```

---

# Run Locally

```bash
git clone <your-repo>
cd wifi_dashboard

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn api.main:app --reload --port 8000
```

Open:

👉 [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

# API Endpoints

| Method | Endpoint       | Description       |
| ------ | -------------- | ----------------- |
| GET    | `/`            | Load dashboard    |
| GET    | `/api/options` | Available filters |
| GET    | `/api/data`    | Chart data        |
| GET    | `/static/*`    | Static files      |

---

# Charts Overview

| Chart         | Purpose                  |
| ------------- | ------------------------ |
| 📈 Line Chart | Performance vs distance  |
| 📊 Bar Chart  | Average comparison       |
| 🕸 Radar      | Multi-metric analysis    |
| 📶 Coverage   | Usable coverage bands    |
| 📉 Drop-off   | Performance degradation  |
| 🔥 Heatmaps   | Spatial patterns         |
| 📉 CDF        | Consistency distribution |
| 🏆 Ranking    | Final comparison         |

---

# 📁 CSV Format

```
{Router}_{Metric} for {Floor} on {Band} band_output.csv
```

### Example:

```
KVD21_Throughput for Lower Floor on 5 GHz band_output.csv
```

# Key Concepts

### Mesh vs No Mesh

* Mesh improves coverage and stability

### Threshold

* Minimum acceptable performance (e.g., 500 Mbps)
* Used to compute coverage

---

# Deployment

## iframe

```html
<iframe src="http://your-server:8000" width="100%" height="900px"></iframe>
```

## FastAPI Mount

```python
app.mount("/wifi", dash_app)
```

## Nginx

```nginx
location /wifi-dashboard/ {
    proxy_pass http://127.0.0.1:8000/;
}
```

---

# Use Cases

* WiFi performance analysis
* Router benchmarking
* Network optimization
* Technical reporting

---

# Future Improvements

* PDF export
* AI recommendations
* Mobile UI
* Real-time data

---

# Contribution

Feel free to fork, improve, and submit PRs.

---

# License

MIT License (or your preferred license)

---

If you want, I can also:

* generate **real screenshot images from your current UI**
* or add **GIF demo preview (very impressive for GitHub)**
