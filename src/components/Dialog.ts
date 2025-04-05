/**
 * A modern dialog component using the native <dialog> HTML element
 * which provides better accessibility and keyboard navigation
 */
export class Dialog {
  private dialog: HTMLDialogElement;
  private contentContainer: HTMLElement;

  constructor(id: string, title: string) {
    // Create dialog element
    this.dialog = document.createElement('dialog');
    this.dialog.id = id;
    this.dialog.className = 'modern-dialog';
    
    // Create dialog structure
    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'dialog-header';
    
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    dialogHeader.appendChild(titleElement);
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'dialog-close';
    closeButton.type = 'button';
    closeButton.onclick = () => this.close();
    dialogHeader.appendChild(closeButton);
    
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'dialog-content';
    
    // Add elements to dialog
    this.dialog.appendChild(dialogHeader);
    this.dialog.appendChild(this.contentContainer);
    
    // Add to document
    document.body.appendChild(this.dialog);
    
    // Handle backdrop click
    this.dialog.addEventListener('click', (event) => {
      const rect = this.dialog.getBoundingClientRect();
      const isInDialog = rect.top <= event.clientY && 
                         event.clientY <= rect.top + rect.height &&
                         rect.left <= event.clientX && 
                         event.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        this.close();
      }
    });
    
    // Prevent click inside the dialog from closing it
    this.dialog.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }

  public open(): void {
    this.dialog.showModal();
  }

  public close(): void {
    this.dialog.close();
  }

  public getContentElement(): HTMLElement {
    return this.contentContainer;
  }
}
