import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Heading from 'renderer/components/Heading';
import { Card } from 'react-bootstrap';
import gamesimg from '../../../../assets/images/Games.png';
import icimg from '../../../../assets/images/InteractiveContents.png';
import quizimg from '../../../../assets/images/Quizzes.png';
import Footer from 'renderer/components/Footer';

interface Items {
  name: string;
  image: string;
  link: string;
}

const Subject = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const grade = queryParams.get('grade');
  const subject = queryParams.get('subject');

  const { subID } = useParams();

  const handleCardClick = (link: any) => {
    console.log(link);
  };

  const subitems: Items[] = [
    {
      name: 'Games',
      image: gamesimg,
      link: '..\\games\\Arthematica\\arithmetica.exe',
    },
    {
      name: 'Interactive Content',
      image: icimg,
      link: '..\\games\\DragandDrop\\Drag-and-Drop.exe',
    },
    {
      name: 'Quizzes',
      image: quizimg,
      link: '..\\games\\Combine the shape\\Combine The Shapes.exe',
    },
  ];

  return (
    <div className="container">
      <Heading />

      <div className="row">
        <div className="col text-center">
          <h1 className="fw-bold" style={{ fontSize: '75px' }}>
            Grade {grade}
          </h1>
          <h2 className="fw-bold"> {subject}</h2>
          <hr
            className="my-5"
            style={{ height: '4px', backgroundColor: 'white' }}
          />
        </div>
      </div>
      <div className="mt-5 d-flex gap-5">
        {subitems.map((item, index) => (
          <div
            style={{ cursor: 'Pointer' }}
            onClick={() => handleCardClick(item.link)}
            key={index}
          >
            <Card>
              <Card.Img variant="top" src={item.image} />
              <Card.Body>
                <Card.Title className="text-black-50 text-center fw-bold">
                  <h4 className="fw-bold">{item.name}</h4>
                </Card.Title>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>

      <div className="pt-5">
        {' '}
        <Footer />
      </div>
    </div>
  );
};

export default Subject;
