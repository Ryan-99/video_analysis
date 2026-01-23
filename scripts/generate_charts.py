#!/usr/bin/env python3
"""
图表生成脚本

使用方法：
1. 安装依赖：pip install matplotlib pillow
2. 传入 JSON 数据文件
3. 生成图表图片到 output/ 目录
"""

import json
import sys
import os
from pathlib import Path
import matplotlib
matplotlib.use('Agg')  # 使用非GUI后端
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def create_monthly_chart(data: list, output_path: str):
    """生成月度趋势折线图"""
    months = [item['month'] for item in data]
    values = [item['avgEngagement'] for item in data]

    plt.figure(figsize=(10, 6))
    plt.plot(months, values, marker='o', linewidth=2, markersize=8, color='#3B82F6')
    plt.title('月度平均互动趋势', fontsize=16, fontweight='bold')
    plt.xlabel('月份', fontsize=12)
    plt.ylabel('互动量', fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(output_path, dpi=100, bbox_inches='tight')
    plt.close()
    print(f"✓ 月度趋势图已生成: {output_path}")

def create_categories_chart(categories: list, output_path: str):
    """生成爆款分类柱状图"""
    names = [cat['category'] for cat in categories]
    values = [cat['count'] for cat in categories]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(names, values, color='#3B82F6', alpha=0.7)
    plt.title('爆款分类统计', fontsize=16, fontweight='bold')
    plt.xlabel('分类', fontsize=12)
    plt.ylabel('数量', fontsize=12)
    plt.grid(True, axis='y', alpha=0.3)
    plt.xticks(rotation=45, ha='right')
    # 添加数值标签
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom')
    plt.tight_layout()
    plt.savefig(output_path, dpi=100, bbox_inches='tight')
    plt.close()
    print(f"✓ 爆款分类图已生成: {output_path}")

def create_daily_chart(data: list, output_path: str):
    """生成每日爆点折线图"""
    dates = [item['date'] for item in data]
    values = [item['count'] for item in data]

    plt.figure(figsize=(12, 6))
    plt.plot(dates, values, marker='o', linewidth=1.5, markersize=4, color='#EF4444')
    plt.title('全周期每日爆点趋势', fontsize=16, fontweight='bold')
    plt.xlabel('日期', fontsize=12)
    plt.ylabel('爆款数量', fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(output_path, dpi=100, bbox_inches='tight')
    plt.close()
    print(f"✓ 每日爆点图已生成: {output_path}")

def main():
    if len(sys.argv) < 3:
        print("使用方法:")
        print("  python generate_charts.py <chart_type> <data_file> <output_path>")
        print("")
        print("图表类型:")
        print("  monthly  - 月度趋势折线图")
        print("  daily    - 每日爆点折线图")
        print("  categories - 爆款分类柱状图")
        print("")
        print("示例:")
        print("  python generate_charts.py monthly data.json output/monthly_trend.png")
        sys.exit(1)

    chart_type = sys.argv[1]
    data_file = sys.argv[2]
    output_path = sys.argv[3]

    # 确保输出目录存在
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # 读取数据
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 生成对应图表
    if chart_type == 'monthly':
        create_monthly_chart(data, output_path)
    elif chart_type == 'daily':
        create_daily_chart(data, output_path)
    elif chart_type == 'categories':
        create_categories_chart(data, output_path)
    else:
        print(f"错误: 不支持的图表类型 '{chart_type}'")
        sys.exit(1)

if __name__ == '__main__':
    main()
