import PDFDocument from 'pdfkit';

export const generateCertificatePDF = (userName, courseName, issuedAt) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const width = doc.page.width;
    const height = doc.page.height;

    // 배경
    doc.rect(0, 0, width, height).fill('#F8F7FF');

    // 테두리
    doc.rect(20, 20, width - 40, height - 40).lineWidth(3).stroke('#4F46E5');

    // 제목
    doc
      .font('Helvetica-Bold')
      .fontSize(42)
      .fillColor('#4F46E5')
      .text('수  료  증', 0, 80, { align: 'center' });

    // Certificate of Completion
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#6B7280')
      .text('Certificate of Completion', 0, 140, { align: 'center' });

    // 구분선
    doc.moveTo(100, 175).lineTo(width - 100, 175).lineWidth(1).stroke('#D1D5DB');

    // 수강자 이름
    doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor('#111827')
      .text(userName, 0, 210, { align: 'center' });

    // 본문
    doc
      .font('Helvetica')
      .fontSize(16)
      .fillColor('#374151')
      .text('위 사람은 아래 과정을 성공적으로 이수하였기에 이 증서를 드립니다.', 0, 270, {
        align: 'center',
      });

    // 강의명
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#4F46E5')
      .text(courseName, 0, 315, { align: 'center' });

    // 날짜
    const dateStr = new Date(issuedAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#6B7280')
      .text(`발급일: ${dateStr}`, 0, 375, { align: 'center' });

    // 발급처
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#111827')
      .text('코딩에듀', 0, 430, { align: 'center' });

    doc.end();
  });
};
