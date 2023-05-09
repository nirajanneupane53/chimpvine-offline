import Grades from './Grades';
import Games from './Games';
import Footer from 'renderer/components/Footer';
import Sponsers from 'renderer/components/Sponsers';
const Home = () => {
  return (
    <div className="mt-5 ">
      <Grades />
      <Games />
      <Sponsers />
      <Footer />
    </div>
  );
};

export default Home;
