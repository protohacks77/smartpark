import type { Reservation, User, ParkingLot } from '../types';

// Declare jsPDF and autoTable from the global scope (CDN)
declare const jspdf: any;

// Define an interface for jsPDF instance with the autoTable method
// FIX: Replaced the problematic 'extends jspdf.jsPDF' with a self-contained interface
// that declares all the methods and properties used in this file. This resolves
// the "Cannot find namespace 'jspdf'" error and all subsequent property access errors.
interface jsPDFWithAutoTable {
  autoTable: (options: any) => jsPDFWithAutoTable;
  setFontSize(size: number): jsPDFWithAutoTable;
  setTextColor(color: string): jsPDFWithAutoTable;
  text(text: string | string[], x: number, y: number, options?: any): jsPDFWithAutoTable;
  internal: {
    getNumberOfPages(): number;
    pageSize: {
      height: number;
    };
  };
  save(filename: string): void;
  lastAutoTable: {
    finalY: number;
  };
}

export const generateReport = (
    reservations: Reservation[], 
    users: User[], 
    parkingLots: ParkingLot[],
    dateRange?: { startDate: Date, endDate: Date }
) => {
    const doc = new jspdf.jsPDF() as jsPDFWithAutoTable;
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let startY = 30;

    // --- Report Header ---
    doc.setFontSize(22);
    doc.setTextColor('#4f46e5'); // Dark Indigo
    doc.text('SmartPark Admin Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor('#475569'); // Dark Slate
    doc.text(`Generated on: ${formattedDate}`, 14, startY);

    if (dateRange) {
        startY += 6;
        const rangeString = `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
        doc.text(`For Period: ${rangeString}`, 14, startY);
    }
    
    // --- Summary Statistics ---
    const totalRevenue = reservations.reduce((sum, res) => sum + res.amountPaid, 0);
    const totalReservations = reservations.length;
    const totalLots = parkingLots.length;
    const totalSlots = parkingLots.reduce((sum, lot) => sum + lot.slots.length, 0);
    const occupiedSlots = parkingLots.reduce((sum, lot) => sum + lot.slots.filter(s => s.isOccupied).length, 0);
    const occupancyRate = totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(1) : '0';
    
    startY += 15;
    doc.setFontSize(14);
    doc.setTextColor('#4f46e5'); // Dark Indigo
    doc.text('Summary', 14, startY);
    
    const summaryData = [
        ['Total Revenue:', `$${totalRevenue.toFixed(2)}`],
        ['Total Reservations:', `${totalReservations}`],
        ['Parking Lots:', `${totalLots}`],
        ['Total Slots:', `${totalSlots}`],
        ['Current Occupancy:', `${occupancyRate}% (${occupiedSlots}/${totalSlots})`],
    ];

    doc.autoTable({
        startY: startY + 5,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2,
            textColor: '#334155' // Slate-700
        },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: '#1e293b' }, // Slate-800
        }
    });

    // --- Detailed Reservations Table ---
    const tableStartY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor('#4f46e5');
    doc.text('Detailed Reservations Log', 14, tableStartY);

    const tableColumn = ["Date", "User", "Lot Name", "Slot", "Duration", "Amount"];
    const tableRows = reservations.map(res => {
        const user = users.find(u => u.uid === res.userId);
        return [
            res.startTime.toDate().toLocaleDateString(),
            user ? user.username : 'N/A',
            res.parkingLotName,
            res.slotId.toUpperCase(),
            `${res.durationHours}h`,
            `$${res.amountPaid.toFixed(2)}`
        ];
    });

    doc.autoTable({
        startY: tableStartY + 5,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: '#4f46e5', // Indigo-600
            textColor: '#ffffff'
        },
        styles: {
            fillColor: '#ffffff', // White cell background
            textColor: '#1e293b', // Dark text
            lineColor: '#e2e8f0', // Light gray lines
            lineWidth: 0.1,
        },
        alternateRowStyles: {
            fillColor: '#f8fafc', // Very light gray for alternate rows
        },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor('#475569'); // Dark Slate for footer
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    // --- Save the PDF ---
    doc.save(`SmartPark_Report_${today.toISOString().split('T')[0]}.pdf`);
};