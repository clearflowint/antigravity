# backend/incremental_pdf_engine.py
"""
ClearFlow Incremental Model V1 PDF Statement Generator.
Architecturally isolated statement renderer for Member Chitti Statements.
Built with ReportLab for institutional-grade visual typography and table formatting.
"""
import io
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_member_statement_pdf(
    chitti: Dict[str, Any],
    share: Dict[str, Any],
    transactions: List[Dict[str, Any]],
    manager: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generates a professional, print-ready PDF statement for an Incremental Model V1 share.
    
    Structure:
    1. Institutional Header (Company, Circle ID, Template, Generation Timestamp)
    2. Member Profile & Share Status Banner
    3. Financial Summary Quadrant (Total Due, Total Paid, Arrears, Advance Credit)
    4. Chronological Ledger Table (Cycle Months, Charges, Receipts, Running Balance)
    5. Official Signoff & Legal Compliance Notice
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A')
    )
    
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1E293B')
    )

    cell_style = ParagraphStyle(
        'CellRegular',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )

    cell_style_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0F172A')
    )

    cell_style_green = ParagraphStyle(
        'CellGreen',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#047857')
    )

    cell_style_red = ParagraphStyle(
        'CellRed',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#B91C1C')
    )

    story = []

    # ---------------------------------------------------------
    # 1. HEADER & BRANDING
    # ---------------------------------------------------------
    chitti_name = chitti.get("Chitti_Name") or chitti.get("chitti_name") or "Chit Fund Circle"
    chitti_id = chitti.get("Chitti_ID") or chitti.get("chitti_id") or "000000"
    template_name = chitti.get("Rule_Template") or "Incremental Model V1"
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")

    header_data = [
        [
            Paragraph("<b>CLEARFLOW CHIT FUND AUTOMATIONS</b><br/><font color='#2563EB'>OFFICIAL MEMBER ACCOUNT STATEMENT</font>", header_title_style),
            Paragraph(f"<b>Chitti ID:</b> {chitti_id}<br/><b>Group:</b> {chitti_name}<br/><b>Template:</b> {template_name}<br/><b>Date:</b> {now_str}", sub_title_style)
        ]
    ]

    header_table = Table(header_data, colWidths=[3.8 * inch, 3.7 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceAfter=12, spaceBefore=4))

    # ---------------------------------------------------------
    # 2. MEMBER & SHARE PROFILE
    # ---------------------------------------------------------
    member_name = share.get("Member_Name") or share.get("member_name") or "Member"
    share_id = share.get("Share_ID") or share.get("share_id") or "SHARE"
    share_num = share.get("Share_Number") or share.get("share_number") or 1
    phone = share.get("Member_Phone") or share.get("Phone") or share.get("Phone_Number") or "+91 98000 00000"
    draw_status = str(share.get("Draw_Status") or share.get("draw_status") or "Undrawn")
    month_drawn = share.get("Won_Cycle_Month") or share.get("Month_Drawn")
    prize_received = share.get("Prize_Amount_Received") or 0.0

    status_str = f"Drawn in M{month_drawn} (₹{prize_received:,.0f})" if draw_status.lower() == "drawn" else "Active Saver (Undrawn)"

    profile_data = [
        [
            Paragraph("<b>Member Name:</b>", cell_style),
            Paragraph(f"<b>{member_name}</b>", cell_style_bold),
            Paragraph("<b>Share Number:</b>", cell_style),
            Paragraph(f"#{share_num:02d} ({share_id})", cell_style_bold)
        ],
        [
            Paragraph("<b>Mobile Phone:</b>", cell_style),
            Paragraph(phone, cell_style),
            Paragraph("<b>Draw Status:</b>", cell_style),
            Paragraph(f"<b>{status_str}</b>", cell_style_bold)
        ]
    ]

    profile_table = Table(profile_data, colWidths=[1.4 * inch, 2.35 * inch, 1.4 * inch, 2.35 * inch])
    profile_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 3. SUMMARY METRICS QUADRANT
    # ---------------------------------------------------------
    # Calculate totals from transactions or share fields
    share_txns = [
        t for t in transactions
        if str(t.get("Share_ID") or t.get("share_id") or "").strip() == str(share_id).strip()
    ]
    share_txns.sort(key=lambda x: int(x.get("Cycle_Month") or x.get("Month_Number") or 0))

    total_due = sum(float(t.get("Debit_Amount") or t.get("debit_amount") or 0.0) for t in share_txns if str(t.get("Transaction_Type") or "").lower() != "manager expense")
    total_paid = sum(float(t.get("Credit_Amount") or t.get("credit_amount") or 0.0) for t in share_txns if str(t.get("Transaction_Type") or "").lower() in ["payment", "credit"])
    pending_arrears = float(share.get("Total_Pending_Arrears") or share.get("total_pending_arrears") or 0.0)
    advance_credit = float(share.get("Advance_Credit") or share.get("advance_credit") or 0.0)

    summary_data = [
        [
            Paragraph("TOTAL TARGET LIABILITY<br/><font size='13' color='#0F172A'><b>₹{:,.0f}</b></font>".format(total_due), cell_style),
            Paragraph("TOTAL PAID TO DATE<br/><font size='13' color='#047857'><b>₹{:,.0f}</b></font>".format(total_paid), cell_style),
            Paragraph("PENDING ARREARS<br/><font size='13' color='{}'><b>₹{:,.0f}</b></font>".format('#B91C1C' if pending_arrears > 0 else '#047857', pending_arrears), cell_style),
            Paragraph("ADVANCE SURPLUS CREDIT<br/><font size='13' color='#2563EB'><b>₹{:,.0f}</b></font>".format(advance_credit), cell_style)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[1.875 * inch] * 4)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F1F5F9')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#ECFDF5')),
        ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#FEF2F2') if pending_arrears > 0 else colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (3, 0), (3, 0), colors.HexColor('#EFF6FF')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # 4. CHRONOLOGICAL TRANSACTION LEDGER
    # ---------------------------------------------------------
    story.append(Paragraph("<b>ACCOUNT TRANSACTION LEDGER</b>", section_heading))
    story.append(Spacer(1, 6))

    table_rows = [
        [
            Paragraph("<b>Month</b>", cell_style_bold),
            Paragraph("<b>Date</b>", cell_style_bold),
            Paragraph("<b>Description / Entry</b>", cell_style_bold),
            Paragraph("<b>Due (Debit)</b>", cell_style_bold),
            Paragraph("<b>Paid (Credit)</b>", cell_style_bold),
            Paragraph("<b>Remarks</b>", cell_style_bold),
        ]
    ]

    if not share_txns:
        table_rows.append([
            Paragraph("—", cell_style),
            Paragraph(now_str[:11], cell_style),
            Paragraph("No transactions recorded yet for this share.", cell_style),
            Paragraph("₹0", cell_style),
            Paragraph("₹0", cell_style),
            Paragraph("Initial active state", cell_style)
        ])
    else:
        for t in share_txns:
            m_num = t.get("Cycle_Month") or t.get("Month_Number") or "—"
            t_date = str(t.get("Transaction_Date") or t.get("transaction_date") or now_str[:11])[:10]
            t_type = t.get("Transaction_Type") or "Ledger Entry"
            debit = float(t.get("Debit_Amount") or 0.0)
            credit = float(t.get("Credit_Amount") or 0.0)
            remarks = t.get("Remarks") or t.get("remarks") or ""

            debit_str = f"₹{debit:,.0f}" if debit > 0 else "—"
            credit_str = f"₹{credit:,.0f}" if credit > 0 else "—"

            table_rows.append([
                Paragraph(f"M{m_num}", cell_style_bold),
                Paragraph(t_date, cell_style),
                Paragraph(t_type, cell_style),
                Paragraph(debit_str, cell_style_red if debit > 0 else cell_style),
                Paragraph(credit_str, cell_style_green if credit > 0 else cell_style),
                Paragraph(remarks[:45] if remarks else "—", cell_style)
            ])

    ledger_table = Table(
        table_rows,
        colWidths=[0.6 * inch, 0.9 * inch, 1.8 * inch, 1.1 * inch, 1.1 * inch, 2.0 * inch]
    )

    # Alternate row colors
    table_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#64748B')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (3, 1), (4, -1), 'RIGHT'),
    ]
    for r_idx in range(1, len(table_rows)):
        bg = colors.HexColor('#F8FAFC') if r_idx % 2 == 0 else colors.white
        table_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), bg))

    ledger_table.setStyle(TableStyle(table_styles))
    story.append(ledger_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # 5. WATERFALL LEDGER NOTICE & OFFICIAL SIGNOFF
    # ---------------------------------------------------------
    signoff_data = [
        [
            Paragraph(
                "<b>Waterfall Settlement Notice:</b> In the Incremental Model V1, all payments clear outstanding arrears first. "
                "Any surplus payments are deposited automatically into the member's Advance Credit balance to offset future cycle liabilities.",
                sub_title_style
            ),
            Paragraph(
                "<b>ClearFlow SaaS Verified</b><br/>Authorized Digital Audit Record<br/><i>No signature required</i>",
                ParagraphStyle('Signoff', parent=sub_title_style, alignment=2)
            )
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[4.8 * inch, 2.7 * inch])
    signoff_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8, spaceBefore=4),
        signoff_table
    ]))

    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
