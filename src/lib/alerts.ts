import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export function showSuccessToast(title: string, text: string) {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    toast: true,
    position: 'top-end',
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
    background: '#0f172a',
    color: '#f8fafc',
  });
}

export function showErrorToast(title: string, text: string) {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    toast: true,
    position: 'top-end',
    timer: 2800,
    timerProgressBar: true,
    showConfirmButton: false,
    background: '#0f172a',
    color: '#f8fafc',
  });
}

export function showConfirmDialog(title: string, text: string, confirmButtonText = 'Ya, lanjutkan', cancelButtonText = 'Batal') {
  return Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    background: '#0f172a',
    color: '#f8fafc',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
  });
}
