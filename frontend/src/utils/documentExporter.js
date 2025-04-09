import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageNumber } from 'docx';
import { jsPDF } from 'jspdf';

// Helper function to clean the content from any markdown or special characters
const cleanContent = (content) => {
  if (!content) return '';
  return content
    .replace(/^\$\d+$/gm, '')
    .replace(/^\$\d+\s*/gm, '')
    .replace(/\$\d+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Parse markdown content for PDF/DOCX formatting
const parseMarkdown = (content) => {
  const lines = cleanContent(content).split('\n');
  const parsedContent = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Handle headers
    if (trimmedLine.startsWith('# ')) {
      parsedContent.push({ type: 'h1', content: trimmedLine.substring(2) });
    } else if (trimmedLine.startsWith('## ')) {
      parsedContent.push({ type: 'h2', content: trimmedLine.substring(3) });
    } else if (trimmedLine.startsWith('### ')) {
      parsedContent.push({ type: 'h3', content: trimmedLine.substring(4) });
    } 
    // Handle bullet points
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
      parsedContent.push({ type: 'bullet', content: trimmedLine.substring(2) });
    }
    // Handle bold text
    else if (trimmedLine.includes('**')) {
      parsedContent.push({ 
        type: 'paragraph', 
        content: trimmedLine,
        hasBold: true 
      });
    } 
    // Regular paragraph
    else if (trimmedLine.length > 0) {
      parsedContent.push({ type: 'paragraph', content: trimmedLine });
    }
    // Empty line
    else {
      parsedContent.push({ type: 'space' });
    }
  });

  return parsedContent;
};

// Export to PDF
export const exportToPDF = async (content, filename, title) => {
  const parsedContent = parseMarkdown(content);
  const doc = new jsPDF();
  
  // Define page variables first to avoid reference errors
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add document title
  doc.setFontSize(20);
  doc.setTextColor(0, 51, 153); // Dark blue for title
  
  // Handle title wrapping
  const titleLines = doc.splitTextToSize(title, pageWidth - 40);
  doc.text(titleLines, 20, 20);
  
  // Add decorative line
  const titleHeight = titleLines.length * 10;
  doc.setDrawColor(0, 51, 153);
  doc.setLineWidth(0.5);
  doc.line(20, 25 + (titleHeight - 10), 190, 25 + (titleHeight - 10));
  
  let yPosition = 35 + (titleHeight - 10);
  
  // Set default font
  doc.setFont("helvetica");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  parsedContent.forEach(item => {
    // Check if we need to add a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    switch (item.type) {
      case 'h1':
        doc.setFontSize(18);
        doc.setTextColor(0, 51, 153); // Blue for headings
        doc.setFont("helvetica", "bold");
        
        // Check if heading needs to be wrapped
        const h1Lines = doc.splitTextToSize(item.content, pageWidth - 40);
        doc.text(h1Lines, 20, yPosition);
        yPosition += h1Lines.length * 10;
        
        doc.setTextColor(0, 0, 0); // Reset text color
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        break;
        
      case 'h2':
        doc.setFontSize(16);
        doc.setTextColor(102, 0, 153); // Purple for subheadings
        doc.setFont("helvetica", "bold");
        
        // Check if subheading needs to be wrapped
        const h2Lines = doc.splitTextToSize(item.content, pageWidth - 40);
        doc.text(h2Lines, 20, yPosition);
        yPosition += h2Lines.length * 8;
        
        doc.setTextColor(0, 0, 0); // Reset text color
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        break;
        
      case 'h3':
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        
        // Check if subheading needs to be wrapped
        const h3Lines = doc.splitTextToSize(item.content, pageWidth - 40);
        doc.text(h3Lines, 20, yPosition);
        yPosition += h3Lines.length * 7;
        
        doc.setFont("helvetica", "normal");
        break;
        
      case 'bullet':
        doc.setFont("helvetica", "normal");
        
        // Handle bullet points that might need wrapping
        const bulletText = item.content;
        const bulletSymbol = '•';
        const bulletIndent = 25;
        const textIndent = 30;
        const maxTextWidth = pageWidth - textIndent - 20; // Available width for text
        
        // Split text to fit within the available width
        const bulletLines = doc.splitTextToSize(bulletText, maxTextWidth);
        
        // Draw the bullet
        doc.text(bulletSymbol, bulletIndent, yPosition);
        
        // Draw each line of text with proper indentation
        for (let i = 0; i < bulletLines.length; i++) {
          // Only add the bullet to the first line
          doc.text(bulletLines[i], textIndent, yPosition + (i * 7));
          
          // If this isn't the last line and there's not enough space for the next line,
          // add a new page
          if (i < bulletLines.length - 1 && yPosition + ((i + 1) * 7) > 270) {
            doc.addPage();
            yPosition = 20 - (i * 7); // Reset position for next lines
          }
        }
        
        // Update y position based on number of lines
        yPosition += bulletLines.length * 7;
        break;
        
      case 'paragraph':
        doc.setFont("helvetica", "normal");
        
        // Handle bold text
        if (item.hasBold) {
          // Split by bold markers
          const parts = item.content.split(/(\*\*.*?\*\*)/g);
          
          // First, calculate total line width to see if we need to wrap
          let totalWidth = 0;
          const partsWithWidth = parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldText = part.replace(/\*\*/g, '');
              doc.setFont("helvetica", "bold");
              const width = doc.getTextWidth(boldText);
              doc.setFont("helvetica", "normal");
              return { text: boldText, width, isBold: true };
            } else if (part) {
              const width = doc.getTextWidth(part);
              return { text: part, width, isBold: false };
            }
            return null;
          }).filter(Boolean);
          
          // Calculate if we need to wrap
          partsWithWidth.forEach(part => {
            totalWidth += part.width;
          });
          
          // If text fits on one line, render it normally
          if (totalWidth <= (pageWidth - 40)) {
            let xOffset = 20;
            partsWithWidth.forEach(part => {
              if (part.isBold) {
                doc.setFont("helvetica", "bold");
                doc.text(part.text, xOffset, yPosition);
                xOffset += part.width;
              } else {
                doc.setFont("helvetica", "normal");
                doc.text(part.text, xOffset, yPosition);
                xOffset += part.width;
              }
            });
            yPosition += 7;
          } else {
            // If text doesn't fit, we need to wrap it more carefully
            // Convert the string with bold markers to plain text first
            const plainText = item.content.replace(/\*\*(.*?)\*\*/g, '$1');
            
            // Split the text to fit the page width
            const wrappedLines = doc.splitTextToSize(plainText, pageWidth - 40);
            
            // Render each line
            doc.setFont("helvetica", "normal");
            doc.text(wrappedLines, 20, yPosition);
            yPosition += wrappedLines.length * 7;
            
            // For mixed formatting, we would need a more complex algorithm
            // For now, we've prioritized readable content over exact formatting
            // when lines need to wrap
          }
        } else {
          // Regular paragraph
          const textLines = doc.splitTextToSize(item.content, pageWidth - 40);
          doc.text(textLines, 20, yPosition);
          yPosition += textLines.length * 7;
        }
        
        if (!item.hasBold) {
          yPosition += 7;
        }
        break;
        
      case 'space':
        yPosition += 5;
        break;
    }
  });
  
  // Add timestamp and page numbers at the bottom
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 40, 285);
  }
  
  // Save the PDF
  doc.save(filename);
};

// Export to DOCX - simplified version
export const exportToDOCX = async (content, filename, title) => {
  const parsedContent = parseMarkdown(content);
  
  try {
    // Create a very simple document with minimal formatting
    const paragraphs = [];
    
    // Add title
    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        bold: true,
      })
    );
    
    // Add a separator line (empty paragraph with border)
    paragraphs.push(
      new Paragraph({
        text: "",
        border: {
          bottom: {
            color: "3333CC",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );
    
    // Add space after title
    paragraphs.push(new Paragraph({ text: "" }));
    
    // Add content
    parsedContent.forEach(item => {
      switch (item.type) {
        case 'h1':
          paragraphs.push(
            new Paragraph({
              text: item.content,
              heading: HeadingLevel.HEADING_1,
              bold: true,
            })
          );
          break;
          
        case 'h2':
          paragraphs.push(
            new Paragraph({
              text: item.content,
              heading: HeadingLevel.HEADING_2,
              bold: true,
            })
          );
          break;
          
        case 'h3':
          paragraphs.push(
            new Paragraph({
              text: item.content,
              heading: HeadingLevel.HEADING_3,
              bold: true,
            })
          );
          break;
          
        case 'bullet':
          paragraphs.push(
            new Paragraph({
              text: item.content,
              bullet: {
                level: 0,
              },
            })
          );
          break;
          
        case 'paragraph':
          if (item.hasBold) {
            // Split by bold markers
            const parts = item.content.split(/(\*\*.*?\*\*)/g);
            const textRuns = parts.map(part => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({
                  text: part.replace(/\*\*/g, ''),
                  bold: true,
                });
              } else if (part) {
                return new TextRun(part);
              }
              return null;
            }).filter(Boolean);
            
            paragraphs.push(
              new Paragraph({
                children: textRuns,
              })
            );
          } else {
            paragraphs.push(
              new Paragraph({
                text: item.content,
              })
            );
          }
          break;
          
        case 'space':
          paragraphs.push(new Paragraph({ text: "" }));
          break;
          
        default:
          if (item.content) {
            paragraphs.push(new Paragraph({ text: item.content }));
          }
      }
    });
    
    // Add generation timestamp at the end
    paragraphs.push(new Paragraph({ text: "" }));
    paragraphs.push(
      new Paragraph({
        text: `Generated: ${new Date().toLocaleString()}`,
        alignment: AlignmentType.RIGHT,
      })
    );
    
    // Create document with simple structure
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: paragraphs,
        },
      ],
    });
    
    // Export to blob
    const blob = await Packer.toBlob(doc);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating DOCX:", error);
    
    // Fallback to plain text if DOCX generation fails
    try {
      console.log("Using plain text fallback for export");
      const plainText = [title, ""];
      
      parsedContent.forEach(item => {
        switch (item.type) {
          case 'h1': plainText.push(`# ${item.content}`); break;
          case 'h2': plainText.push(`## ${item.content}`); break;
          case 'h3': plainText.push(`### ${item.content}`); break;
          case 'bullet': plainText.push(`• ${item.content}`); break;
          case 'paragraph': plainText.push(item.content.replace(/\*\*/g, '')); break;
          case 'space': plainText.push(''); break;
        }
      });
      
      plainText.push('');
      plainText.push(`Generated: ${new Date().toLocaleString()}`);
      
      const textContent = plainText.join('\n');
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      
      const textUrl = URL.createObjectURL(textBlob);
      const link = document.createElement('a');
      link.href = textUrl;
      // Change extension to .txt for fallback
      link.download = filename.replace('.docx', '.txt');
      link.click();
      URL.revokeObjectURL(textUrl);
    } catch (fallbackError) {
      console.error("Fallback export also failed:", fallbackError);
      throw new Error("Failed to export document: " + error.message);
    }
  }
}; 