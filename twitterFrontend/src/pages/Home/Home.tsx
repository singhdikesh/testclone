import { Sidebar } from '../../components/Sidebar/Sidebar'
import MainFeed from '../../components/MainFeed/MainFeed'
import RightSidebar from '../../components/RightSidebar/RightSidebar'

export default function Home() {
  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1305px] grid-cols-[275px_minmax(0,680px)_minmax(280px,350px)] px-4 sm:px-0 lg:w-[calc(100%-32px)]">
      <Sidebar />
      <MainFeed />
      <RightSidebar />
    </div>
  )
}
