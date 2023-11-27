import { Modal, Spinner } from 'react-bootstrap';

interface LoadingModalProps {
  modal: boolean;
}

function LoadingModal({ modal }: LoadingModalProps) {
  return (
    <div className="loading-modal">
      <Modal id="loading-modal" show={modal} centered animation={false}>
        <Modal.Body className="text-center">
          <div className="d-flex align-items-center justify-content-center">
            <Spinner animation="border" />
            <span className="fw-bold fs-3 ms-3">Loading Game...</span>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default LoadingModal;
