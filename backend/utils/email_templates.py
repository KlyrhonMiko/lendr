def get_inventory_alert_html(
    alert_type: str,
    item_name: str,
    item_id: str,
    available_qty: int,
    total_qty: int,
    threshold_pct: int,
    current_pct: float,
    app_url: str = "http://localhost:3000"
) -> str:
    """
    Generate a professional HTML email for inventory alerts.
    """
    
    # Color logic
    primary_color = "#ef4444" if alert_type == "LOW_STOCK" else "#f59e0b"
    background_color = "#fee2e2" if alert_type == "LOW_STOCK" else "#fef3c7"
    
    # Progress bar logic
    progress_pct = max(0, min(100, current_pct))
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory Alert</title>
    <style>
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
        .container {{
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background-color: #ffffff;
            padding: 32px 40px;
            border-bottom: 1px solid #f1f5f9;
            text-align: center;
        }}
        .brand {{
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.025em;
            text-decoration: none;
        }}
        .brand span {{
            color: #d97706;
        }}
        .content {{
            padding: 40px;
        }}
        .badge {{
            display: inline-block;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 24px;
            background-color: {background_color};
            color: {primary_color};
        }}
        .title {{
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 16px 0;
        }}
        .message {{
            font-size: 16px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 32px;
        }}
        .item-card {{
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid #f1f5f9;
        }}
        .item-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }}
        .item-label {{
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }}
        .item-value {{
            font-size: 14px;
             color: #0f172a;
            font-weight: 600;
        }}
        .progress-container {{
            height: 8px;
            background-color: #e2e8f0;
            border-radius: 4px;
            margin-top: 20px;
            overflow: hidden;
        }}
        .progress-bar {{
            height: 100%;
            background-color: {primary_color};
            width: {progress_pct}%;
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 32px 40px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
        }}
        .btn {{
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            font-size: 15px;
            transition: background-color 0.2s;
        }}
        .footer-text {{
            font-size: 13px;
            color: #94a3b8;
            margin-top: 24px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        td {{
            padding: 8px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="badge">{alert_type.replace('_', ' ')}</div>
            <h1 class="title">Inventory Threshold Breached</h1>
            <p class="message">
                We've detected that <strong>{item_name}</strong> has reached a {alert_type.lower().replace('_', ' ')} state. Please review the inventory levels and take necessary action.
            </p>
            
            <div class="item-card">
                <table>
                    <tr>
                        <td class="item-label">Item ID</td>
                        <td class="item-value" align="right">{item_id}</td>
                    </tr>
                    <tr>
                        <td class="item-label">Item Name</td>
                        <td class="item-value" align="right">{item_name}</td>
                    </tr>
                    <tr>
                        <td class="item-label">Current Stock</td>
                        <td class="item-value" align="right">{available_qty} / {total_qty} units</td>
                    </tr>
                    <tr>
                        <td class="item-label">Capacity</td>
                        <td class="item-value" align="right">{current_pct:.1f}%</td>
                    </tr>
                    <tr>
                        <td class="item-label">Threshold</td>
                        <td class="item-value" align="right">{threshold_pct}%</td>
                    </tr>
                </table>
                <div class="progress-container">
                    <div class="progress-bar"></div>
                </div>
            </div>

        </div>
        <div class="footer">
            <div class="footer-text">
                This is an automated notification from your PowerGold Inventory System.<br>
                For support, contact your system administrator.
            </div>
        </div>
    </div>
</body>
</html>
    """
