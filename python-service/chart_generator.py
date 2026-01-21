import matplotlib.pyplot as plt
import matplotlib
import io
import base64

matplotlib.use('Agg')
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def generate_chart(chart_type: str, title: str, data: dict, config: dict = {}) -> dict:
    fig, ax = plt.subplots(figsize=(10, 6))
    if chart_type == 'line':
        x, y = data.get('x', []), data.get('y', [])
        ax.plot(x, y, marker='o', linewidth=2, markersize=6)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel(data.get('xlabel', ''), fontsize=12)
        ax.set_ylabel(data.get('ylabel', ''), fontsize=12)
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45 if len(x) > 5 else 0)
    elif chart_type == 'bar':
        categories, values = data.get('categories', []), data.get('values', [])
        colors = plt.cm.Set3(range(len(categories)))
        ax.bar(categories, values, color=colors)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_ylabel(data.get('ylabel', ''), fontsize=12)
        for i, v in enumerate(values): ax.text(i, v, str(v), ha='center', va='bottom')
        plt.xticks(rotation=45 if len(categories) > 5 else 0)
    elif chart_type == 'pie':
        labels, values = data.get('labels', []), data.get('values', [])
        colors = plt.cm.Set3(range(len(labels)))
        wedges, texts, autotexts = ax.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
        for autotext in autotexts: autotext.set_fontsize(10)
        ax.set_title(title, fontsize=14, fontweight='bold')
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return {'image': img_base64, 'type': 'png'}
