import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import game1 from '../../../../assets/images/games/arithmetica.png';
import game2 from '../../../../assets/images/games/drag.png';
import game3 from '../../../../assets/images/games/combine-shape.png';
import game4 from '../../../../assets/images/games/bubble.png';

interface Games {
  name: string;
  image: string;
  link: string;
}

const Games = () => {
  const [cardModule, setCardModule] = useState<any>(null);

  useEffect(() => {
    import('react-bootstrap').then((module) => {
      setCardModule(module.Card);
      // ipcRenderer.send('open-app');
    });
  }, []);

  const games: Games[] = [
    {
      name: 'Arithmetica',
      image: game1,
      link: '..\\games\\Arthematica\\arithmetica.exe',
    },
    {
      name: 'Drag & Drop',
      image: game2,
      link: '..\\games\\DragandDrop\\Drag-and-Drop.exe',
    },
    {
      name: 'Combining Shape',
      image: game3,
      link: '..\\games\\Combine the shape\\Combine The Shapes.exe',
    },
    {
      name: 'Bubble Multiple',
      image: game4,
      link: '..\\games\\Bubble-Multiple\\Bubblemultiples.exe',
    },
  ];

  const handleCardClick = (link: any) => {
    console.log(link);
    window.electron.ipcRenderer.sendMessage('start-game', link);
  };

  return (
    <div className="my-5">
      <h2 className="fw-bold">Games</h2>
      <div className="mt-5 d-flex gap-5">
        {games.map((game, index) => (
          <div
            style={{ cursor: 'Pointer' }}
            onClick={() => handleCardClick(game.link)}
            key={index}
          >
            {cardModule && (
              <Card>
                {/* <Card.Img variant="top" src={game.image} /> */}
                <Card.Img variant="top" src={game.image} />
                <Card.Body>
                  <Card.Title className="text-black-50 text-center fw-bold">
                    <h4 className="fw-bold">{game.name}</h4>
                  </Card.Title>
                </Card.Body>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
