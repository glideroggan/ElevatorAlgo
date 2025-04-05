export class Modal {
  private modal: HTMLElement;
  private modalContent: HTMLElement;
  private isOpen: boolean = false;

  constructor(id: string, title: string) {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.id = id;
    this.modal.className = 'modal';
    
    // Create modal content
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = title;
    modalHeader.appendChild(modalTitle);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => this.close();
    modalHeader.appendChild(closeButton);
    
    this.modalContent = document.createElement('div');
    this.modalContent.className = 'modal-content';
    
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(this.modalContent);
    this.modal.appendChild(modalContainer);
    
    // Add to document
    document.body.appendChild(this.modal);
    
    // Close when clicking outside
    this.modal.onclick = (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    };
  }

  public open(): void {
    this.modal.style.display = 'flex';
    this.isOpen = true;
  }

  public close(): void {
    this.modal.style.display = 'none';
    this.isOpen = false;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public getContentElement(): HTMLElement {
    return this.modalContent;
  }
}
