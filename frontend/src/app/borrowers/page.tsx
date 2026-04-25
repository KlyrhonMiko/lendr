import { redirect } from 'next/navigation';

export default function BorrowersIndexPage() {
  redirect('/borrowers/history');
}
