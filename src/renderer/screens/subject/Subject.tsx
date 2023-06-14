import { useParams, useNavigate } from 'react-router-dom';
import { useLocation, Link } from 'react-router-dom';
import Heading from 'renderer/components/Heading';

import { Card } from 'react-bootstrap';
import gamesimg from '../../../../assets/images/Games.png';
import icimg from '../../../../assets/images/InteractiveContents.png';
// import quizimg from '../../../../assets/images/Quizzes.png';
import Footer from 'renderer/components/Footer';

interface Items {
  name: string;
  image: string;
  id: string;
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
    console.log(subID);
  };

  const subitems: Items[] = [
    {
      name: 'Games',
      id: 'Games',
      image: gamesimg,
      link: '..\\games\\Arthematica\\arithmetica.exe',
    },
    // {
    //   name: 'Interactive Content',
    //   id: 'IC',
    //   image: icimg,
    //   link: '..\\games\\DragandDrop\\Drag-and-Drop.exe',
    // },
    {
      name: 'Interactive Content',
      id: 'InteractiveContent',
      image: icimg,
      link: '..\\games\\DragandDrop\\Drag-and-Drop.exe',
    },
    // {
    //   name: 'Quizzes',
    //   image: quizimg,
    //   link: '..\\games\\Combine the shape\\Combine The Shapes.exe',
    // },
  ];

  return (
    <div className="container">
      <Heading />

      <div className="row">
        <div className="col text-center">
          <h1 className="fw-bold" style={{ fontSize: '50px' }}>
            Grade {grade}
          </h1>
          <h2 className="fw-bold" style={{ fontSize: '25px' }}>
            {' '}
            {subject}
          </h2>
          <hr
            className="my-4"
            style={{ height: '4px', backgroundColor: 'white' }}
          />
        </div>
      </div>
      <div className=" d-flex gap-5">
        {subitems.map((item, index) => (
          // <Link  to={`/subject/${subject.link}?grade=${grade.grade}&subject=${subject.name}`}>
          <div key={index}>
            <Link
              to={`/subject/${subID}/${item.name}?id=${item.id}&grade=${grade}&subject=${subject}`}
            >
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
            </Link>
          </div>
        ))}
      </div>

      <div className="">
        {' '}
        <Footer />
      </div>
    </div>
  );
};

export default Subject;
